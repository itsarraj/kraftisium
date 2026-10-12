use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, sqlx::FromRow)]
pub struct PaymentOrderRow {
    pub id: Uuid,
    pub user_id: Uuid,
    pub razorpay_order_id: String,
    pub razorpay_payment_id: Option<String>,
    pub amount_minor: i64,
    pub currency: String,
    pub status: String,
    pub plan_id: String,
    pub promo_code_id: Option<Uuid>,
    pub signature_verified: bool,
    pub created_at: DateTime<Utc>,
    pub paid_at: Option<DateTime<Utc>>,
}

#[derive(Clone)]
pub struct PaymentRepository {
    pool: PgPool,
}

impl PaymentRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn insert_order(
        &self,
        user_id: Uuid,
        razorpay_order_id: &str,
        amount_minor: u64,
        currency: &str,
        plan_id: &str,
        promo_code_id: Option<Uuid>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO payment_orders (user_id, razorpay_order_id, amount_minor, currency, plan_id, promo_code_id, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'created')
            ON CONFLICT (razorpay_order_id) DO NOTHING
            "#,
        )
        .bind(user_id)
        .bind(razorpay_order_id)
        .bind(amount_minor as i64)
        .bind(currency)
        .bind(plan_id)
        .bind(promo_code_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn find_by_payment_id(
        &self,
        razorpay_payment_id: &str,
    ) -> Result<Option<PaymentOrderRow>, sqlx::Error> {
        sqlx::query_as::<_, PaymentOrderRow>(
            r#"
            SELECT id, user_id, razorpay_order_id, razorpay_payment_id, amount_minor, currency,
                   status, plan_id, signature_verified, created_at, paid_at
            FROM payment_orders
            WHERE razorpay_payment_id = $1
            "#,
        )
        .bind(razorpay_payment_id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn find_by_order_id(
        &self,
        razorpay_order_id: &str,
    ) -> Result<Option<PaymentOrderRow>, sqlx::Error> {
        sqlx::query_as::<_, PaymentOrderRow>(
            r#"
            SELECT id, user_id, razorpay_order_id, razorpay_payment_id, amount_minor, currency,
                   status, plan_id, signature_verified, created_at, paid_at
            FROM payment_orders
            WHERE razorpay_order_id = $1
            "#,
        )
        .bind(razorpay_order_id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn mark_paid(
        &self,
        razorpay_order_id: &str,
        razorpay_payment_id: &str,
        signature_verified: bool,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            UPDATE payment_orders
            SET status = 'paid',
                razorpay_payment_id = $2,
                signature_verified = $3,
                paid_at = CURRENT_TIMESTAMP
            WHERE razorpay_order_id = $1
              AND status != 'paid'
            "#,
        )
        .bind(razorpay_order_id)
        .bind(razorpay_payment_id)
        .bind(signature_verified)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }
}
