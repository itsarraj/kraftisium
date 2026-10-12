use crate::configuration::RazorpaySettings;
use crate::module::payments::model::PaymentError;
use crate::module::payments::repository::PaymentRepository;
use crate::module::subscription::{model::PLAN_YEARLY_PREMIUM, service::SubscriptionService};
use base64::Engine;
use hmac::{Hmac, Mac};
use serde::Deserialize;
use sha2::Sha256;
use std::sync::Arc;
use uuid::Uuid;

type HmacSha256 = Hmac<Sha256>;

const RAZORPAY_ORDERS_URL: &str = "https://api.razorpay.com/v1/orders";
const MIN_AMOUNT_MINOR: u64 = 100;

#[derive(Clone)]
pub struct PaymentService {
    razorpay: RazorpaySettings,
    subscription: Arc<SubscriptionService>,
    repository: PaymentRepository,
    http: reqwest::Client,
}

impl PaymentService {
    pub fn new(
        razorpay: RazorpaySettings,
        subscription: Arc<SubscriptionService>,
        repository: PaymentRepository,
    ) -> Self {
        Self {
            razorpay,
            subscription,
            repository,
            http: reqwest::Client::new(),
        }
    }

    pub fn is_configured(&self) -> bool {
        self.razorpay.is_configured()
    }

    pub fn checkout_meta(&self) -> Option<(u64, String, String)> {
        if !self.is_configured() {
            return None;
        }
        let key_id = self.razorpay.key_id.clone().unwrap_or_default();
        Some((
            self.razorpay.yearly_amount_paise,
            self.razorpay.currency.clone(),
            key_id,
        ))
    }

    pub async fn create_order(
        &self,
        user_id: Uuid,
        promo_code: Option<String>,
    ) -> Result<super::model::CreateOrderResponse, PaymentError> {
        if !self.is_configured() {
            return Err(PaymentError::NotConfigured);
        }

        if self
            .subscription
            .is_premium(user_id)
            .await
            .map_err(|e| PaymentError::DatabaseError(e.to_string()))?
        {
            return Err(PaymentError::AlreadySubscribed);
        }

        let mut amount = self.razorpay.yearly_amount_paise;
        let mut promo_code_id = None;

        if let Some(code) = promo_code {
            let promo_res = self
                .subscription
                .validate_promo(&code)
                .await
                .map_err(|e| PaymentError::DatabaseError(e.to_string()))?;

            if promo_res.is_valid {
                let discount_ratio = promo_res.discount_amount_usd as f64 / promo_res.original_price_usd as f64;
                let discount_paise = (amount as f64 * discount_ratio).round() as u64;
                amount = amount.saturating_sub(discount_paise);
                promo_code_id = promo_res.promo_id;

                if amount == 0 {
                    self.subscription
                        .grant_promo_premium(user_id, promo_code_id.unwrap(), promo_res.duration_months)
                        .await
                        .map_err(|e| PaymentError::DatabaseError(e.to_string()))?;

                    let pseudo_order_id = format!("free-promo-{}", Uuid::new_v4());
                    return Ok(super::model::CreateOrderResponse {
                        order_id: pseudo_order_id,
                        amount: 0,
                        currency: self.razorpay.currency.clone(),
                        key_id: "free".to_string(),
                    });
                }
            }
        }

        if amount < MIN_AMOUNT_MINOR {
            return Err(PaymentError::InvalidAmount);
        }

        let user_short: String = user_id.to_string().replace('-', "").chars().take(8).collect();
        let receipt = format!("prem-{}-{user_short}", chrono::Utc::now().timestamp());
        debug_assert!(receipt.len() <= 40, "receipt must be <= 40 chars for Razorpay");
        let body = serde_json::json!({
            "amount": amount,
            "currency": self.razorpay.currency,
            "receipt": receipt,
            "notes": {
                "user_id": user_id.to_string(),
                "plan_id": PLAN_YEARLY_PREMIUM
            }
        });

        let key_id = self.razorpay.key_id.as_ref().unwrap();
        let key_secret = self.razorpay.key_secret.as_ref().unwrap();
        let auth = base64::engine::general_purpose::STANDARD
            .encode(format!("{key_id}:{key_secret}"));

        let response = self
            .http
            .post(RAZORPAY_ORDERS_URL)
            .header("Authorization", format!("Basic {auth}"))
            .json(&body)
            .send()
            .await
            .map_err(|e| {
                log::error!("Razorpay create order request failed: {e}");
                PaymentError::RazorpayApiError
            })?;

        if response.status() == reqwest::StatusCode::UNAUTHORIZED {
            let body = response.text().await.unwrap_or_default();
            log::error!(
                "Razorpay create order: unauthorized — KEY_ID and KEY_SECRET must be a matching pair from Razorpay Dashboard → Settings → API Keys. Response: {body}"
            );
            return Err(PaymentError::Unauthorized);
        }

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            log::error!("Razorpay create order failed ({status}): {body}");
            return Err(PaymentError::RazorpayApiError);
        }

        let order: RazorpayOrderResponse = response.json().await.map_err(|e| {
            log::error!("Razorpay create order parse failed: {e}");
            PaymentError::RazorpayApiError
        })?;

        if let Err(e) = self
            .repository
            .insert_order(
                user_id,
                &order.id,
                amount,
                &self.razorpay.currency,
                PLAN_YEARLY_PREMIUM,
                promo_code_id,
            )
            .await
        {
            log::error!("Failed to record payment order {order_id}: {e}", order_id = order.id);
        }

        Ok(super::model::CreateOrderResponse {
            order_id: order.id,
            amount,
            currency: self.razorpay.currency.clone(),
            key_id: key_id.clone(),
        })
    }

    pub async fn verify_payment(
        &self,
        user_id: Uuid,
        order_id: &str,
        payment_id: &str,
        signature: &str,
    ) -> Result<super::model::VerifyPaymentResponse, PaymentError> {
        if !self.is_configured() {
            return Err(PaymentError::NotConfigured);
        }

        if order_id.trim().is_empty() || payment_id.trim().is_empty() || signature.trim().is_empty() {
            return Err(PaymentError::MissingFields);
        }

        if let Some(existing) = self
            .repository
            .find_by_payment_id(payment_id)
            .await
            .map_err(|e| PaymentError::DatabaseError(e.to_string()))?
        {
            if existing.status == "paid" {
                return Ok(super::model::VerifyPaymentResponse {
                    success: true,
                    message: "Payment already verified. Your Premium subscription is active.".to_string(),
                });
            }
        }

        let key_secret = self.razorpay.key_secret.as_ref().unwrap();
        if !Self::verify_signature(order_id, payment_id, signature, key_secret) {
            return Err(PaymentError::InvalidSignature);
        }

        if self
            .subscription
            .is_premium(user_id)
            .await
            .map_err(|e| PaymentError::DatabaseError(e.to_string()))?
        {
            let _ = self
                .repository
                .mark_paid(order_id, payment_id, true)
                .await;
            return Ok(super::model::VerifyPaymentResponse {
                success: true,
                message: "Payment verified. Your Premium subscription is already active.".to_string(),
            });
        }

        let (amount_minor, currency) = self
            .repository
            .find_by_order_id(order_id)
            .await
            .map_err(|e| PaymentError::DatabaseError(e.to_string()))?
            .map(|o| (o.amount_minor as u64, o.currency))
            .unwrap_or((self.razorpay.yearly_amount_paise, self.razorpay.currency.clone()));

        self.subscription
            .grant_paid_premium(user_id, amount_minor, &currency)
            .await
            .map_err(|e| PaymentError::DatabaseError(e.to_string()))?;

        if let Err(e) = self
            .repository
            .mark_paid(order_id, payment_id, true)
            .await
        {
            log::error!("Failed to mark payment order paid: {e}");
        }

        log::info!(
            "Razorpay payment verified for user {user_id}: order={order_id} payment={payment_id}"
        );

        Ok(super::model::VerifyPaymentResponse {
            success: true,
            message: "Payment successful! Your Yearly Premium subscription is now active.".to_string(),
        })
    }

    pub async fn handle_webhook(
        &self,
        raw_body: &[u8],
        signature: &str,
    ) -> Result<(), PaymentError> {
        if !self.is_configured() {
            return Err(PaymentError::NotConfigured);
        }

        let secret = self
            .razorpay
            .webhook_secret
            .as_deref()
            .or(self.razorpay.key_secret.as_deref())
            .ok_or(PaymentError::NotConfigured)?;

        if !Self::verify_webhook_signature(raw_body, signature, secret) {
            return Err(PaymentError::InvalidSignature);
        }

        let event: RazorpayWebhookEvent = serde_json::from_slice(raw_body).map_err(|e| {
            log::error!("Razorpay webhook parse failed: {e}");
            PaymentError::MissingFields
        })?;

        if event.event != "payment.captured" {
            return Ok(());
        }

        let payment = event.payload.payment.entity;
        let order_id = payment.order_id.as_deref().unwrap_or_default();
        let payment_id = payment.id.as_str();
        if order_id.is_empty() || payment_id.is_empty() {
            return Err(PaymentError::MissingFields);
        }

        if let Some(existing) = self
            .repository
            .find_by_payment_id(payment_id)
            .await
            .map_err(|e| PaymentError::DatabaseError(e.to_string()))?
        {
            if existing.status == "paid" {
                return Ok(());
            }
        }

        let user_id = if let Some(notes) = payment.notes.as_ref() {
            notes
                .user_id
                .as_deref()
                .and_then(|id| Uuid::parse_str(id).ok())
        } else {
            None
        };

        let user_id = match user_id {
            Some(id) => id,
            None => {
                let row = self
                    .repository
                    .find_by_order_id(order_id)
                    .await
                    .map_err(|e| PaymentError::DatabaseError(e.to_string()))?;
                match row {
                    Some(r) => r.user_id,
                    None => {
                        log::warn!("Razorpay webhook: unknown order {order_id}");
                        return Ok(());
                    }
                }
            }
        };

        if !self
            .subscription
            .is_premium(user_id)
            .await
            .map_err(|e| PaymentError::DatabaseError(e.to_string()))?
        {
            let (amount_minor, currency) = self
                .repository
                .find_by_order_id(order_id)
                .await
                .map_err(|e| PaymentError::DatabaseError(e.to_string()))?
                .map(|o| (o.amount_minor as u64, o.currency))
                .unwrap_or((self.razorpay.yearly_amount_paise, self.razorpay.currency.clone()));

            self.subscription
                .grant_paid_premium(user_id, amount_minor, &currency)
                .await
                .map_err(|e| PaymentError::DatabaseError(e.to_string()))?;
        }

        let _ = self
            .repository
            .mark_paid(order_id, payment_id, true)
            .await;

        log::info!(
            "Razorpay webhook granted premium for user {user_id}: order={order_id} payment={payment_id}"
        );

        Ok(())
    }

    fn verify_signature(order_id: &str, payment_id: &str, signature: &str, key_secret: &str) -> bool {
        let payload = format!("{order_id}|{payment_id}");
        let mut mac = match HmacSha256::new_from_slice(key_secret.as_bytes()) {
            Ok(m) => m,
            Err(_) => return false,
        };
        mac.update(payload.as_bytes());
        let Ok(sig_bytes) = hex::decode(signature) else {
            return false;
        };
        // Constant-time comparison — a naive `==` on the hex strings leaks
        // timing information an attacker could use to forge a valid signature.
        mac.verify_slice(&sig_bytes).is_ok()
    }

    fn verify_webhook_signature(raw_body: &[u8], signature: &str, secret: &str) -> bool {
        let mut mac = match HmacSha256::new_from_slice(secret.as_bytes()) {
            Ok(m) => m,
            Err(_) => return false,
        };
        mac.update(raw_body);
        let Ok(sig_bytes) = hex::decode(signature) else {
            return false;
        };
        mac.verify_slice(&sig_bytes).is_ok()
    }
}

#[derive(Debug, Deserialize)]
struct RazorpayOrderResponse {
    id: String,
}

#[derive(Debug, Deserialize)]
struct RazorpayWebhookEvent {
    event: String,
    payload: RazorpayWebhookPayload,
}

#[derive(Debug, Deserialize)]
struct RazorpayWebhookPayload {
    payment: RazorpayWebhookPaymentWrapper,
}

#[derive(Debug, Deserialize)]
struct RazorpayWebhookPaymentWrapper {
    entity: RazorpayWebhookPayment,
}

#[derive(Debug, Deserialize)]
struct RazorpayWebhookPayment {
    id: String,
    order_id: Option<String>,
    notes: Option<RazorpayPaymentNotes>,
}

#[derive(Debug, Deserialize)]
struct RazorpayPaymentNotes {
    user_id: Option<String>,
}
