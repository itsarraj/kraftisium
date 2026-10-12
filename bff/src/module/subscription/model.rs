use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub const PLAN_YEARLY_PREMIUM: &str = "yearly_premium";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionInfo {
    pub is_premium: bool,
    pub premium_until: Option<DateTime<Utc>>,
    pub plan_id: Option<String>,
    pub source: Option<String>,
    pub founding_slot: Option<i32>,
    pub can_upgrade: bool,
    pub yearly_price_usd: u32,
    pub free_ai_matches_limit: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromoBannerInfo {
    pub founding_premium_limit: u32,
    pub founding_granted_count: u32,
    pub founding_slots_remaining: u32,
    pub founding_offer_active: bool,
    pub yearly_price_usd: u32,
    pub free_ai_matches_limit: u32,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentCheckoutInfo {
    pub amount_paise: u64,
    pub currency: String,
    pub key_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutStatusResponse {
    pub status: String,
    pub message: String,
    pub is_premium: bool,
    pub premium_until: Option<DateTime<Utc>>,
    pub yearly_price_usd: u32,
    #[serde(default)]
    pub payments_enabled: bool,
    pub amount_paise: Option<u64>,
    pub currency: Option<String>,
    pub razorpay_key_id: Option<String>,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct SubscriptionRow {
    pub user_id: Uuid,
    pub plan_id: String,
    pub status: String,
    pub source: String,
    pub founding_slot: Option<i32>,
    pub current_period_start: DateTime<Utc>,
    pub current_period_end: DateTime<Utc>,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct PromoCodeRow {
    pub id: Uuid,
    pub code: String,
    pub discount_percentage: i32,
    pub duration_months: Option<i32>,
    pub valid_from: DateTime<Utc>,
    pub valid_until: Option<DateTime<Utc>>,
    pub max_uses: Option<i32>,
    pub used_count: i32,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidatePromoResponse {
    pub is_valid: bool,
    pub promo_id: Option<Uuid>,
    pub duration_months: Option<i32>,
    pub original_price_usd: u32,
    pub discount_amount_usd: u32,
    pub final_price_usd: u32,
    pub error_message: Option<String>,
}
