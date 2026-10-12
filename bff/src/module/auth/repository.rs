use crate::module::auth::model::{
    AdminOverview, AdminUserRow, AuthError, ReferralSettingsRow, RefreshToken, User,
};
use chrono::{DateTime, NaiveDateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct UserRepository {
    pool: PgPool,
}

impl UserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// One aggregate query across users/resumes/jobs/applications/subscriptions
    /// for the minimal read-only admin overview — not a full analytics
    /// pipeline, just enough to tell whether anyone is actually using the app.
    pub async fn admin_overview(&self) -> Result<AdminOverview, AuthError> {
        let row = sqlx::query_as::<_, (i64, i64, i64, i64, i64, i64, i64, i64, i64, i64)>(
            r#"
            SELECT
                (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL),
                (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'),
                (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND role = 'user'),
                (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND role = 'recruiter'),
                (SELECT COUNT(*) FROM resumes),
                (SELECT COUNT(*) FROM jobs WHERE COALESCE(status, 'active') = 'active'),
                (SELECT COUNT(*) FROM applications),
                (SELECT COUNT(*) FROM applications WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'),
                (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND current_period_end > CURRENT_TIMESTAMP),
                (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days')
            "#,
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        Ok(AdminOverview {
            total_users: row.0,
            signups_7d: row.1,
            total_candidates: row.2,
            total_recruiters: row.3,
            resumes_uploaded: row.4,
            active_jobs: row.5,
            applications_total: row.6,
            applications_7d: row.7,
            premium_subscribers: row.8,
            premium_conversions_7d: row.9,
        })
    }

    pub async fn admin_list_recent_users(&self, limit: i64) -> Result<Vec<AdminUserRow>, AuthError> {
        sqlx::query_as::<_, AdminUserRow>(
            r#"
            SELECT id, email, name, role, email_verified, is_premium_candidate, created_at
            FROM users
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| AuthError::DatabaseError(e.to_string()))
    }

    pub async fn create_user(&self, user: &User) -> Result<User, AuthError> {
        let row = sqlx::query(
            "INSERT INTO users (id, email, password_hash, name, role, email_verified, google_sub, email_verification_token, email_verification_expires_at, referral_code, referred_by, is_premium_candidate, terms_accepted_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING *"
        )
        .bind(user.id)
        .bind(&user.email)
        .bind(&user.password_hash)
        .bind(&user.name)
        .bind(&user.role)
        .bind(user.email_verified)
        .bind(&user.google_sub)
        .bind(&user.email_verification_token)
        .bind(user.email_verification_expires_at)
        .bind(&user.referral_code)
        .bind(user.referred_by)
        .bind(user.is_premium_candidate)
        .bind(user.terms_accepted_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        User::from_row(&row).map_err(|e| AuthError::DatabaseError(e.to_string()))
    }

    pub async fn find_by_google_sub(&self, google_sub: &str) -> Result<Option<User>, AuthError> {
        let row = sqlx::query("SELECT * FROM users WHERE google_sub = $1")
            .bind(google_sub)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        match row {
            Some(row) => {
                let user =
                    User::from_row(&row).map_err(|e| AuthError::DatabaseError(e.to_string()))?;
                Ok(Some(user))
            }
            None => Ok(None),
        }
    }

    pub async fn link_google_sub(
        &self,
        user_id: Uuid,
        google_sub: &str,
    ) -> Result<(), AuthError> {
        sqlx::query(
            "UPDATE users SET google_sub = $1, email_verified = TRUE, updated_at = NOW() WHERE id = $2",
        )
        .bind(google_sub)
        .bind(user_id)
        .execute(&self.pool)
        .await
        .map_err(|e| AuthError::DatabaseError(e.to_string()))?;
        Ok(())
    }

    pub async fn find_by_email(&self, email: &str) -> Result<Option<User>, AuthError> {
        let row = sqlx::query("SELECT * FROM users WHERE email = $1")
            .bind(email)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        match row {
            Some(row) => {
                let user =
                    User::from_row(&row).map_err(|e| AuthError::DatabaseError(e.to_string()))?;
                Ok(Some(user))
            }
            None => Ok(None),
        }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AuthError> {
        let row = sqlx::query("SELECT * FROM users WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        match row {
            Some(row) => {
                let user =
                    User::from_row(&row).map_err(|e| AuthError::DatabaseError(e.to_string()))?;
                Ok(Some(user))
            }
            None => Ok(None),
        }
    }

    pub async fn find_by_verification_token(&self, token: &str) -> Result<Option<User>, AuthError> {
        let row = sqlx::query(
            "SELECT * FROM users
             WHERE email_verification_token = $1
               AND (email_verification_expires_at IS NULL OR email_verification_expires_at > $2)"
        )
            .bind(token)
            .bind(Utc::now().naive_utc())
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        match row {
            Some(row) => {
                let user =
                    User::from_row(&row).map_err(|e| AuthError::DatabaseError(e.to_string()))?;
                Ok(Some(user))
            }
            None => Ok(None),
        }
    }

    pub async fn find_by_password_reset_token(
        &self,
        token: &str,
    ) -> Result<Option<User>, AuthError> {
        let row = sqlx::query(
            "SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires_at > $2"
        )
        .bind(token)
        .bind(Utc::now())
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        match row {
            Some(row) => {
                let user =
                    User::from_row(&row).map_err(|e| AuthError::DatabaseError(e.to_string()))?;
                Ok(Some(user))
            }
            None => Ok(None),
        }
    }

    pub async fn update_email_verified(
        &self,
        user_id: Uuid,
        verified: bool,
    ) -> Result<(), AuthError> {
        sqlx::query(
            "UPDATE users
             SET email_verified = $1,
                 updated_at = NOW()
             WHERE id = $2",
        )
        .bind(verified)
        .bind(user_id)
        .execute(&self.pool)
        .await
        .map_err(|e| AuthError::DatabaseError(e.to_string()))?;
        Ok(())
    }

    pub async fn update_email_verification_token(
        &self,
        user_id: Uuid,
        token_hash: &str,
        expires_at: chrono::NaiveDateTime,
    ) -> Result<(), AuthError> {
        sqlx::query(
            "UPDATE users
             SET email_verified = false,
                 email_verification_token = $1,
                 email_verification_expires_at = $2,
                 updated_at = NOW()
             WHERE id = $3",
        )
        .bind(token_hash)
        .bind(expires_at)
        .bind(user_id)
        .execute(&self.pool)
        .await
        .map_err(|e| AuthError::DatabaseError(e.to_string()))?;
        Ok(())
    }

    pub async fn update_password_reset_token(
        &self,
        user_id: Uuid,
        token: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), AuthError> {
        sqlx::query("UPDATE users SET password_reset_token = $1, password_reset_expires_at = $2 WHERE id = $3")
            .bind(token)
            .bind(expires_at)
            .bind(user_id)
            .execute(&self.pool)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;
        Ok(())
    }

    pub async fn update_password(
        &self,
        user_id: Uuid,
        password_hash: &str,
    ) -> Result<(), AuthError> {
        sqlx::query("UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires_at = NULL WHERE id = $2")
            .bind(password_hash)
            .bind(user_id)
            .execute(&self.pool)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;
        Ok(())
    }

    pub async fn update_profile(
        &self,
        user_id: Uuid,
        name: Option<&str>,
        email: Option<&str>,
    ) -> Result<(), AuthError> {
        if name.is_some() || email.is_some() {
            let mut query = "UPDATE users SET ".to_string();
            let mut params = Vec::new();
            let mut param_count = 1;

            if let Some(name_val) = name {
                query.push_str(&format!("name = ${}, ", param_count));
                params.push(name_val);
                param_count += 1;
            }

            if let Some(email_val) = email {
                query.push_str(&format!("email = ${}, ", param_count));
                params.push(email_val);
                param_count += 1;
            }

            // Remove trailing comma and space
            query.truncate(query.len() - 2);
            query.push_str(&format!(" WHERE id = ${}", param_count));

            let mut sql_query = sqlx::query(&query);
            for param in params {
                sql_query = sql_query.bind(param);
            }
            sql_query = sql_query.bind(user_id);

            sql_query
                .execute(&self.pool)
                .await
                .map_err(|e| AuthError::DatabaseError(e.to_string()))?;
        }
        Ok(())
    }

    pub async fn find_by_referral_code(&self, code: &str) -> Result<Option<User>, AuthError> {
        let row = sqlx::query("SELECT * FROM users WHERE referral_code = $1")
            .bind(code)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        match row {
            Some(row) => {
                let user =
                    User::from_row(&row).map_err(|e| AuthError::DatabaseError(e.to_string()))?;
                Ok(Some(user))
            }
            None => Ok(None),
        }
    }

    pub async fn count_completed_referrals(&self, user_id: Uuid) -> Result<i64, AuthError> {
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(DISTINCT u.id) FROM users u INNER JOIN resumes r ON r.user_id = u.id WHERE u.referred_by = $1"
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AuthError::DatabaseError(e.to_string()))?;
        Ok(count.0)
    }

    pub async fn set_premium_candidate(&self, user_id: Uuid, premium: bool) -> Result<(), AuthError> {
        sqlx::query("UPDATE users SET is_premium_candidate = $1, updated_at = NOW() WHERE id = $2")
            .bind(premium)
            .bind(user_id)
            .execute(&self.pool)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;
        Ok(())
    }

    pub async fn find_referral_settings(&self) -> Result<ReferralSettingsRow, AuthError> {
        sqlx::query_as::<_, ReferralSettingsRow>(
            "SELECT credits_per_referral, credits_required_for_redemption, redemption_premium_months FROM referral_settings WHERE id",
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AuthError::DatabaseError(e.to_string()))
    }

    pub async fn add_referral_credits(&self, user_id: Uuid, amount: i32, reason: &str) -> Result<(), AuthError> {
        let mut tx = self.pool.begin().await.map_err(|e| AuthError::DatabaseError(e.to_string()))?;
        
        sqlx::query("UPDATE users SET referral_credits = referral_credits + $1, updated_at = NOW() WHERE id = $2")
            .bind(amount)
            .bind(user_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        sqlx::query("INSERT INTO credit_transactions (id, user_id, amount, reason) VALUES ($1, $2, $3, $4)")
            .bind(Uuid::new_v4())
            .bind(user_id)
            .bind(amount)
            .bind(reason)
            .execute(&mut *tx)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        tx.commit().await.map_err(|e| AuthError::DatabaseError(e.to_string()))?;
        Ok(())
    }

    pub async fn deduct_referral_credits(&self, user_id: Uuid, amount: i32, reason: &str) -> Result<(), AuthError> {
        let mut tx = self.pool.begin().await.map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        let affected = sqlx::query("UPDATE users SET referral_credits = referral_credits - $1, updated_at = NOW() WHERE id = $2 AND referral_credits >= $1")
            .bind(amount)
            .bind(user_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        if affected.rows_affected() == 0 {
            return Err(AuthError::DatabaseError("Insufficient credits".to_string()));
        }

        sqlx::query("INSERT INTO credit_transactions (id, user_id, amount, reason) VALUES ($1, $2, $3, $4)")
            .bind(Uuid::new_v4())
            .bind(user_id)
            .bind(-amount)
            .bind(reason)
            .execute(&mut *tx)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        tx.commit().await.map_err(|e| AuthError::DatabaseError(e.to_string()))?;
        Ok(())
    }

    /// Snapshot user-owned data, then soft-close the account and free email/google/referral.
    /// Child rows stay in hot tables forever (ponytail: no purge path).
    pub async fn soft_delete_account(&self, user_id: Uuid) -> Result<(), AuthError> {
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        let row = sqlx::query("SELECT * FROM users WHERE id = $1 FOR UPDATE")
            .bind(user_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?
            .ok_or(AuthError::UserNotFound)?;

        let user = User::from_row(&row).map_err(|e| AuthError::DatabaseError(e.to_string()))?;
        if user.is_deleted() {
            return Err(AuthError::AccountAlreadyDeleted);
        }

        let payload = Self::build_archive_payload(&mut tx, user_id).await?;

        sqlx::query(
            "INSERT INTO account_archives (id, user_id, email, google_sub, payload)
             VALUES ($1, $2, $3, $4, $5)",
        )
        .bind(Uuid::new_v4())
        .bind(user_id)
        .bind(&user.email)
        .bind(&user.google_sub)
        .bind(&payload)
        .execute(&mut *tx)
        .await
        .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        let archived_email = User::archived_email(user_id);
        let archived_referral = User::archived_referral_code(user_id);

        sqlx::query(
            "UPDATE users SET
                deleted_at = NOW(),
                email = $1,
                google_sub = NULL,
                password_hash = NULL,
                referral_code = $2,
                email_verification_token = NULL,
                email_verification_expires_at = NULL,
                password_reset_token = NULL,
                password_reset_expires_at = NULL,
                updated_at = NOW()
             WHERE id = $3 AND deleted_at IS NULL",
        )
        .bind(&archived_email)
        .bind(&archived_referral)
        .bind(user_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        tx.commit()
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;
        Ok(())
    }

    async fn build_archive_payload(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        user_id: Uuid,
    ) -> Result<serde_json::Value, AuthError> {
        async fn one(
            tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
            sql: &str,
            user_id: Uuid,
        ) -> Result<serde_json::Value, AuthError> {
            let v: Option<serde_json::Value> = sqlx::query_scalar(sql)
                .bind(user_id)
                .fetch_optional(&mut **tx)
                .await
                .map_err(|e| AuthError::DatabaseError(e.to_string()))?;
            Ok(v.unwrap_or(serde_json::Value::Null))
        }

        async fn many(
            tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
            sql: &str,
            user_id: Uuid,
        ) -> Result<serde_json::Value, AuthError> {
            let v: serde_json::Value = sqlx::query_scalar(sql)
                .bind(user_id)
                .fetch_one(&mut **tx)
                .await
                .map_err(|e| AuthError::DatabaseError(e.to_string()))?;
            Ok(v)
        }

        Ok(serde_json::json!({
            "user": one(tx, "SELECT to_jsonb(u) FROM users u WHERE id = $1", user_id).await?,
            "candidate_profile": one(tx, "SELECT to_jsonb(t) FROM candidate_profiles t WHERE user_id = $1", user_id).await?,
            "employer_profile": one(tx, "SELECT to_jsonb(t) FROM employer_profiles t WHERE user_id = $1", user_id).await?,
            "resumes": many(tx, "SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM resumes t WHERE user_id = $1", user_id).await?,
            "applications": many(tx, "SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM applications t WHERE user_id = $1", user_id).await?,
            "saved_jobs": many(tx, "SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM saved_jobs t WHERE user_id = $1", user_id).await?,
            "subscriptions": many(tx, "SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM subscriptions t WHERE user_id = $1", user_id).await?,
            "payment_orders": many(tx, "SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM payment_orders t WHERE user_id = $1", user_id).await?,
            "credit_transactions": many(tx, "SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM credit_transactions t WHERE user_id = $1", user_id).await?,
            "recruiter_companies": many(tx, "SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM recruiter_companies t WHERE user_id = $1", user_id).await?,
            "talent_pool_resumes": many(tx, "SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM talent_pool_resumes t WHERE user_id = $1", user_id).await?,
            "suggested_jobs": many(tx, "SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM suggested_jobs t WHERE user_id = $1", user_id).await?,
            "embeddings": one(tx, "SELECT to_jsonb(t) FROM user_resume_embeddings t WHERE user_id = $1", user_id).await?,
        }))
    }
}

pub struct RefreshTokenRepository {
    pool: PgPool,
}

impl RefreshTokenRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, token: &RefreshToken) -> Result<(), AuthError> {
        sqlx::query(
            "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)"
        )
        .bind(token.id)
        .bind(token.user_id)
        .bind(&token.token_hash)
        .bind(token.expires_at)
        .execute(&self.pool)
        .await
        .map_err(|e| AuthError::DatabaseError(e.to_string()))?;
        Ok(())
    }

    pub async fn find_by_hash(&self, token_hash: &str) -> Result<Option<RefreshToken>, AuthError> {
        let row =
            sqlx::query("SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > $2")
                .bind(token_hash)
                .bind(Utc::now().naive_utc())
                .fetch_optional(&self.pool)
                .await
                .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        match row {
            Some(row) => {
                let token = RefreshToken::from_row(&row)
                    .map_err(|e| AuthError::DatabaseError(e.to_string()))?;
                Ok(Some(token))
            }
            None => Ok(None),
        }
    }

    pub async fn delete_by_user_id(&self, user_id: Uuid) -> Result<(), AuthError> {
        sqlx::query("DELETE FROM refresh_tokens WHERE user_id = $1")
            .bind(user_id)
            .execute(&self.pool)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;
        Ok(())
    }

    pub async fn delete_by_hash(&self, token_hash: &str) -> Result<(), AuthError> {
        sqlx::query("DELETE FROM refresh_tokens WHERE token_hash = $1")
            .bind(token_hash)
            .execute(&self.pool)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;
        Ok(())
    }
}

pub struct TokenBlacklistRepository {
    pool: PgPool,
}

impl TokenBlacklistRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn add_to_blacklist(
        &self,
        token_hash: &str,
        expires_at: NaiveDateTime,
    ) -> Result<(), AuthError> {
        sqlx::query("INSERT INTO token_blacklist (id, token_hash, expires_at) VALUES ($1, $2, $3)")
            .bind(Uuid::new_v4())
            .bind(token_hash)
            .bind(expires_at)
            .execute(&self.pool)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;
        Ok(())
    }

    pub async fn is_blacklisted(&self, token_hash: &str) -> Result<bool, AuthError> {
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM token_blacklist WHERE token_hash = $1 AND expires_at > $2",
        )
        .bind(token_hash)
        .bind(Utc::now().naive_utc())
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        Ok(count.0 > 0)
    }

    pub async fn cleanup_expired(&self) -> Result<(), AuthError> {
        sqlx::query("DELETE FROM token_blacklist WHERE expires_at <= $1")
            .bind(Utc::now().naive_utc())
            .execute(&self.pool)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;
        Ok(())
    }
}
