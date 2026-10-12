#!/usr/bin/env bash
# Backs up Postgres (pg_dump) and mirrors the RustFS object storage bucket
# to an off-VPS S3-compatible target (Cloudflare R2 by default). Both the
# DB and RustFS live on the same VPS disk with zero redundancy otherwise —
# this is what actually protects against disk failure / VPS loss, not just
# a bad migration.
set -euo pipefail

require() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "[backup] missing required env var: $name" >&2
    exit 1
  fi
}

for var in POSTGRES_HOST POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB \
           BFF__OBJECT_STORAGE__ENDPOINT BFF__OBJECT_STORAGE__BUCKET BFF__OBJECT_STORAGE__ACCESS_KEY_ID BFF__OBJECT_STORAGE__SECRET_ACCESS_KEY \
           BACKUP_S3_ENDPOINT BACKUP_S3_BUCKET BACKUP_S3_ACCESS_KEY_ID BACKUP_S3_SECRET_ACCESS_KEY; do
  require "$var"
done

TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

echo "[backup] $TIMESTAMP starting"

# --- Postgres dump ---
DUMP_FILE="$WORKDIR/postgres-$TIMESTAMP.sql.gz"
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$POSTGRES_HOST" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --no-owner --no-privileges \
  | gzip > "$DUMP_FILE"
echo "[backup] postgres dump: $(du -h "$DUMP_FILE" | cut -f1)"

# --- rclone remotes, configured entirely via env so no secrets touch disk in a config file ---
export RCLONE_CONFIG_BACKUPTARGET_TYPE=s3
export RCLONE_CONFIG_BACKUPTARGET_PROVIDER="${BACKUP_S3_PROVIDER:-Cloudflare}"
export RCLONE_CONFIG_BACKUPTARGET_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID"
export RCLONE_CONFIG_BACKUPTARGET_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_BACKUPTARGET_ENDPOINT="$BACKUP_S3_ENDPOINT"

export RCLONE_CONFIG_OBJECTSTORE_TYPE=s3
export RCLONE_CONFIG_OBJECTSTORE_PROVIDER=Other
export RCLONE_CONFIG_OBJECTSTORE_ACCESS_KEY_ID="$BFF__OBJECT_STORAGE__ACCESS_KEY_ID"
export RCLONE_CONFIG_OBJECTSTORE_SECRET_ACCESS_KEY="$BFF__OBJECT_STORAGE__SECRET_ACCESS_KEY"
export RCLONE_CONFIG_OBJECTSTORE_ENDPOINT="$BFF__OBJECT_STORAGE__ENDPOINT"

# --- Upload the dump ---
rclone copy "$DUMP_FILE" "backuptarget:${BACKUP_S3_BUCKET}/postgres/"
echo "[backup] postgres dump uploaded"

# --- Mirror resumes straight from RustFS to the backup bucket (streamed through rclone, not through this container's disk) ---
rclone sync "objectstore:${BFF__OBJECT_STORAGE__BUCKET}" "backuptarget:${BACKUP_S3_BUCKET}/resumes/"
echo "[backup] object storage mirrored"

# --- Retention: drop postgres dumps older than RETENTION_DAYS ---
RETENTION_DAYS="${RETENTION_DAYS:-14}"
rclone delete "backuptarget:${BACKUP_S3_BUCKET}/postgres/" --min-age "${RETENTION_DAYS}d"
echo "[backup] pruned dumps older than ${RETENTION_DAYS}d"

echo "[backup] $TIMESTAMP complete"
