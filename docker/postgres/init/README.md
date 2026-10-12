Postgres schema is applied with sqlx migrations from `bff/migrations/` (see `scripts/vps-migrate.sh`), not via init scripts in this folder.

This directory is mounted for optional one-off SQL on first cluster init only.
