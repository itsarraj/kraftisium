use crate::module::subscription::model::{SubscriptionRow, PromoCodeRow};
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

/// Serializes founding-slot assignment across concurrent signups (Postgres forbids FOR UPDATE on aggregates).
const FOUNDING_SLOT_ADVISORY_LOCK_KEY: i64 = 0x4a0b_5e47;

#[derive(Clone)]
pub struct SubscriptionRepository {
    pool: PgPool,
}

impl SubscriptionRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn count_founding_grants(&self) -> Result<i64, sqlx::Error> {
        let row: (i64,) = sqlx::query_as(
            "SELECT COUNT(*)::bigint FROM subscriptions WHERE founding_slot IS NOT NULL",
        )
        .fetch_one(&self.pool)
        .await?;
        Ok(row.0)
    }

    pub async fn find_by_user(&self, user_id: Uuid) -> Result<Option<SubscriptionRow>, sqlx::Error> {
        sqlx::query_as::<_, SubscriptionRow>(
            r#"
            SELECT user_id, plan_id, status, source, founding_slot,
                   current_period_start, current_period_end
            FROM subscriptions
            WHERE user_id = $1
            "#,
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
    }

    /// Atomically assign the next founding slot if under limit.
    pub async fn try_grant_next_founding(
        &self,
        user_id: Uuid,
        limit: i64,
        period_end: DateTime<Utc>,
        source: &str,
    ) -> Result<Option<i32>, sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        sqlx::query("SELECT pg_advisory_xact_lock($1)")
            .bind(FOUNDING_SLOT_ADVISORY_LOCK_KEY)
            .execute(&mut *tx)
            .await?;

        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*)::bigint FROM subscriptions WHERE founding_slot IS NOT NULL",
        )
        .fetch_one(&mut *tx)
        .await?;

        if count.0 >= limit {
            tx.rollback().await?;
            return Ok(None);
        }

        let slot = (count.0 + 1) as i32;

        let inserted = sqlx::query(
            r#"
            INSERT INTO subscriptions (
                user_id, plan_id, status, source, founding_slot,
                current_period_start, current_period_end, created_at, updated_at
            )
            VALUES ($1, 'yearly_premium', 'active', $2, $3, NOW(), $4, NOW(), NOW())
            ON CONFLICT (user_id) DO NOTHING
            "#,
        )
        .bind(user_id)
        .bind(source)
        .bind(slot)
        .bind(period_end)
        .execute(&mut *tx)
        .await?;

        if inserted.rows_affected() == 0 {
            tx.rollback().await?;
            return Ok(None);
        }

        tx.commit().await?;
        Ok(Some(slot))
    }

    pub async fn grant_paid_premium(
        &self,
        user_id: Uuid,
        years: i64,
    ) -> Result<(), sqlx::Error> {
        let period_end = Utc::now() + chrono::Duration::days(years * 365);
        sqlx::query(
            r#"
            INSERT INTO subscriptions (
                user_id, plan_id, status, source, founding_slot,
                current_period_start, current_period_end, created_at, updated_at
            )
            VALUES ($1, 'yearly_premium', 'active', 'payment', NULL, NOW(), $2, NOW(), NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                plan_id = 'yearly_premium',
                status = 'active',
                source = 'payment',
                current_period_start = NOW(),
                current_period_end = $2,
                updated_at = NOW()
            "#,
        )
        .bind(user_id)
        .bind(period_end)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn grant_custom_premium(
        &self,
        user_id: Uuid,
        months: i64,
    ) -> Result<(), sqlx::Error> {
        let period_end = Utc::now() + chrono::Duration::days(months * 30);
        sqlx::query(
            r#"
            INSERT INTO subscriptions (
                user_id, plan_id, status, source, founding_slot,
                current_period_start, current_period_end, created_at, updated_at
            )
            VALUES ($1, 'yearly_premium', 'active', 'referral_credits', NULL, NOW(), $2, NOW(), NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                plan_id = 'yearly_premium',
                status = 'active',
                source = 'referral_credits',
                current_period_start = NOW(),
                current_period_end = GREATEST(subscriptions.current_period_end, NOW()) + make_interval(days := ($3 * 30)),
                updated_at = NOW()
            "#,
        )
        .bind(user_id)
        .bind(period_end)
        .bind(months as i32)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn find_promo_by_code(&self, code: &str) -> Result<Option<PromoCodeRow>, sqlx::Error> {
        sqlx::query_as::<_, PromoCodeRow>(
            r#"
            SELECT id, code, discount_percentage, duration_months, valid_from, valid_until, max_uses, used_count, is_active
            FROM promo_codes
            WHERE code = $1
            "#,
        )
        .bind(code.to_uppercase())
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn increment_promo_usage(&self, promo_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1")
            .bind(promo_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

