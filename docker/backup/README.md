# Backups

Scheduled container (`compose.prod.yml` service `backup`) that, every `BACKUP_INTERVAL_SECONDS`
(default 24h):

1. `pg_dump`s Postgres, gzips it, uploads to `${BACKUP_S3_BUCKET}/postgres/` on the off-VPS target.
2. `rclone sync`s the RustFS object storage bucket (resumes) to `${BACKUP_S3_BUCKET}/resumes/` on the same target.
3. Deletes postgres dumps older than `BACKUP_RETENTION_DAYS` (default 14) from the target.

Both Postgres and RustFS live on the same VPS disk with no redundancy otherwise — this is what
protects against disk failure or losing the VPS entirely, not just a bad migration.

## One-time setup (Cloudflare R2 example)

1. Cloudflare dashboard → R2 → create a bucket (e.g. `kraftisium-backups`).
2. R2 → Manage API Tokens → create a token scoped to that bucket (read + write).
3. Note the **Account ID**, **Access Key ID**, and **Secret Access Key** from that token.
4. Fill in the `.env` on the VPS (see `docker/vps.env.example`):

   ```
   BACKUP_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   BACKUP_S3_BUCKET=kraftisium-backups
   BACKUP_S3_ACCESS_KEY_ID=...
   BACKUP_S3_SECRET_ACCESS_KEY=...
   ```

Any other S3-compatible provider (Backblaze B2, AWS S3, another R2-alike) works the same way —
just set `BACKUP_S3_ENDPOINT` to that provider's endpoint and `BACKUP_S3_PROVIDER=Other` if it
isn't Cloudflare.

Optional: turn on bucket versioning in the R2 dashboard for the backup bucket if you want
point-in-time recovery of resumes rather than just the latest mirrored state — the script itself
only ever mirrors "current state", it doesn't keep history for the resumes side (it does for
Postgres, via the dated dump files).

## Restoring

Postgres — download a dump and pipe it into `psql`:

```bash
export RCLONE_CONFIG_BACKUPTARGET_TYPE=s3
export RCLONE_CONFIG_BACKUPTARGET_PROVIDER=Cloudflare
export RCLONE_CONFIG_BACKUPTARGET_ACCESS_KEY_ID=...
export RCLONE_CONFIG_BACKUPTARGET_SECRET_ACCESS_KEY=...
export RCLONE_CONFIG_BACKUPTARGET_ENDPOINT=...

rclone lsf backuptarget:kraftisium-backups/postgres/          # find the timestamp you want
rclone copy backuptarget:kraftisium-backups/postgres/postgres-<timestamp>.sql.gz .
gunzip -c postgres-<timestamp>.sql.gz | psql "$DATABASE_URL"
```

Resumes — mirror the backup bucket back onto RustFS (same env vars as above, plus the
`objectstore:` remote from `backup.sh`):

```bash
rclone sync backuptarget:kraftisium-backups/resumes objectstore:resumes
```
