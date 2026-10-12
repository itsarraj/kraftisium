#!/usr/bin/env bash
# Updated seed for kraftisium with specific test accounts.
#
# Usage:
#   ./seeds/run_seed.sh
#
# Requires: psql, DATABASE_URL (or bff/.env)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SEEDS="$ROOT/seeds"

if [[ -z "${DATABASE_URL:-}" ]] && [[ -f "$ROOT/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "$ROOT/.env"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set. Export it or add it to bff/.env" >&2
  exit 1
fi

run_sql() {
  local file="$1"
  echo "→ $(basename "$file")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
}

echo ""
echo "🔄 Running migrations first to ensure schema is up to date..."
cd "$ROOT"
cargo sqlx migrate run

echo "🌱 Running seed script..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SEEDS/seed.sql"

echo "✅ Seeding completed!"

echo ""
echo "Counts:"
psql "$DATABASE_URL" -c "
SELECT 'users' AS entity, COUNT(*)::TEXT AS n FROM users
UNION ALL SELECT 'companies', COUNT(*)::TEXT FROM companies
UNION ALL SELECT 'jobs', COUNT(*)::TEXT FROM jobs
UNION ALL SELECT 'resumes', COUNT(*)::TEXT FROM resumes
UNION ALL SELECT 'applications', COUNT(*)::TEXT FROM applications
UNION ALL SELECT 'suggested_jobs', COUNT(*)::TEXT FROM suggested_jobs
UNION ALL SELECT 'subscriptions', COUNT(*)::TEXT FROM subscriptions
ORDER BY entity;
"
echo ""
echo "Demo passwords (email/password): admin123"
