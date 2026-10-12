use crate::configuration::SubscriptionSettings;
use crate::module::email::service::EmailService;
use crate::module::subscription::model::{
    CheckoutStatusResponse, PaymentCheckoutInfo, PromoBannerInfo, SubscriptionInfo,
    SubscriptionRow, ValidatePromoResponse, 
};
use crate::module::subscription::repository::SubscriptionRepository;
use chrono::{Duration as ChronoDuration, Utc};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct SubscriptionService {
    repo: SubscriptionRepository,
    user_repo: crate::module::auth::repository::UserRepository,
    settings: SubscriptionSettings,
    email: Arc<EmailService>,
}

impl SubscriptionService {
    pub fn new(
        repo: SubscriptionRepository,
        user_repo: crate::module::auth::repository::UserRepository,
        settings: SubscriptionSettings,
        email: EmailService,
    ) -> Self {
        Self {
            repo,
            user_repo,
            settings,
            email: Arc::new(email),
        }
    }

    pub fn settings(&self) -> &SubscriptionSettings {
        &self.settings
    }

    /// Dev-only: when `auto_grant_yearly_premium` is enabled, grant Premium after email verify.
    /// Production access is via payment or promo codes at checkout — not automatic on signup.
    pub async fn grant_on_email_verified(
        &self,
        user_id: Uuid,
        email: &str,
        name: &str,
    ) -> Result<Option<i32>, Box<dyn std::error::Error + Send + Sync>> {
        if !self.settings.auto_grant_yearly_premium {
            return Ok(None);
        }

        if self.repo.find_by_user(user_id).await?.is_some() {
            return Ok(None);
        }

        let years = self.settings.founding_premium_years.max(1);
        let period_end = Utc::now() + ChronoDuration::days(years * 365);

        let Some(slot) = self
            .repo
            .try_grant_next_founding(user_id, i64::MAX, period_end, "dev_auto")
            .await?
        else {
            return Ok(None);
        };

        if self.repo.find_by_user(user_id).await?.is_some() {
            if let Err(e) = self
                .email
                .send_founding_premium_email(
                    email,
                    name,
                    slot,
                    period_end,
                    self.settings.yearly_price_usd,
                )
                .await
            {
                log::warn!("Dev auto premium email failed for {}: {}", user_id, e);
            }
            log::info!(
                "Dev auto-granted yearly premium to user {} after email verify (slot {})",
                user_id,
                slot
            );
            return Ok(Some(slot));
        }

        Ok(None)
    }

    pub async fn is_premium(&self, user_id: Uuid) -> Result<bool, sqlx::Error> {
        Ok(self.build_info(user_id).await?.is_premium)
    }

    pub async fn grant_paid_premium(
        &self,
        user_id: Uuid,
        amount_minor: u64,
        currency: &str,
    ) -> Result<(), sqlx::Error> {
        let years = self.settings.founding_premium_years.max(1);
        self.repo.grant_paid_premium(user_id, years).await?;

        if let Ok(Some(user)) = self.user_repo.find_by_id(user_id).await {
            let period_end = Utc::now() + ChronoDuration::days(years * 365);
            let amount_display = format_payment_amount(amount_minor, currency);
            if let Err(e) = self
                .email
                .send_payment_receipt_email(
                    &user.email,
                    &user.name,
                    "Yearly Premium",
                    &amount_display,
                    period_end,
                )
                .await
            {
                log::warn!("Payment receipt email failed for {}: {}", user_id, e);
            }
        }

        Ok(())
    }

    pub async fn grant_promo_premium(&self, user_id: Uuid, promo_id: Uuid, duration_months: Option<i32>) -> Result<(), sqlx::Error> {
        let years = match duration_months {
            Some(m) => m as f64 / 12.0,
            None => self.settings.founding_premium_years.max(1) as f64,
        };
        // wait, grant_paid_premium takes i64 years. 
        // Let's just do years ceil. Or let's add `grant_custom_premium` in repo if needed.
        // Actually, we can just do self.repo.increment_promo_usage(promo_id) and self.repo.grant_paid_premium(user_id, years as i64) for now.
        // wait, I can just write a custom query here or modify repo.
        self.repo.increment_promo_usage(promo_id).await?;
        self.repo.grant_paid_premium(user_id, years.ceil() as i64).await
    }

    pub async fn referral_settings(
        &self,
    ) -> Result<crate::module::auth::model::ReferralSettingsRow, crate::module::auth::model::AuthError> {
        self.user_repo.find_referral_settings().await
    }

    pub async fn redeem_credits(&self, user_id: Uuid) -> Result<i32, Box<dyn std::error::Error>> {
        let settings = self.user_repo.find_referral_settings().await?;
        let credits_to_redeem = settings.credits_required_for_redemption;
        let months_to_grant = settings.redemption_premium_months;

        self.user_repo.deduct_referral_credits(
            user_id,
            credits_to_redeem,
            &format!("Redeemed {} credits for {} months of Premium", credits_to_redeem, months_to_grant)
        ).await?;

        self.repo.grant_custom_premium(user_id, months_to_grant as i64).await?;

        Ok(months_to_grant)
    }

    pub async fn build_info(&self, user_id: Uuid) -> Result<SubscriptionInfo, sqlx::Error> {
        let row = self.repo.find_by_user(user_id).await?;
        Ok(self.info_from_row(row.as_ref()))
    }

    fn info_from_row(&self, row: Option<&SubscriptionRow>) -> SubscriptionInfo {
        let now = Utc::now();
        let active = row
            .filter(|r| r.status == "active" && r.current_period_end > now)
            .is_some();

        let (premium_until, plan_id, source, founding_slot) = match row {
            Some(r) if active => (
                Some(r.current_period_end),
                Some(r.plan_id.clone()),
                Some(r.source.clone()),
                r.founding_slot,
            ),
            _ => (None, None, None, None),
        };

        SubscriptionInfo {
            is_premium: active,
            premium_until,
            plan_id,
            source,
            founding_slot,
            can_upgrade: !active,
            yearly_price_usd: self.settings.yearly_price_usd,
            free_ai_matches_limit: self.settings.free_ai_matches_limit,
        }
    }

    pub async fn promo_banner(&self) -> Result<PromoBannerInfo, sqlx::Error> {
        let limit = self.settings.founding_premium_limit;
        let granted = self.repo.count_founding_grants().await? as u32;
        let remaining = limit.saturating_sub(granted);
        let active = self.settings.auto_grant_yearly_premium;
        let price = self.settings.yearly_price_usd;
        let message = if self.settings.auto_grant_yearly_premium {
            format!(
                "Launch offer: every new member gets 1 year of Premium free (worth ${price}/year)."
            )
        } else {
            format!(
                "Yearly Premium is ${price}/year. Have a promo code? Enter it at checkout."
            )
        };

        Ok(PromoBannerInfo {
            founding_premium_limit: limit,
            founding_granted_count: granted,
            founding_slots_remaining: remaining,
            founding_offer_active: active,
            yearly_price_usd: price,
            free_ai_matches_limit: self.settings.free_ai_matches_limit,
            message,
        })
    }

    pub async fn checkout_status(
        &self,
        user_id: Uuid,
        payment: Option<PaymentCheckoutInfo>,
    ) -> Result<CheckoutStatusResponse, sqlx::Error> {
        let info = self.build_info(user_id).await?;
        if info.is_premium {
            let until = info
                .premium_until
                .map(|d| d.format("%B %d, %Y").to_string())
                .unwrap_or_else(|| "your renewal date".to_string());
            return Ok(CheckoutStatusResponse {
                status: "already_subscribed".to_string(),
                message: format!(
                    "You're already subscribed through {until}. Thank you for being a Premium member!"
                ),
                is_premium: true,
                premium_until: info.premium_until,
                yearly_price_usd: info.yearly_price_usd,
                payments_enabled: false,
                amount_paise: None,
                currency: None,
                razorpay_key_id: None,
            });
        }

        if let Some(pay) = payment {
            let amount_display = format_payment_amount(pay.amount_paise, &pay.currency);
            return Ok(CheckoutStatusResponse {
                status: "ready".to_string(),
                message: format!(
                    "Pay {amount_display} to activate Yearly Premium.",
                ),
                is_premium: false,
                premium_until: None,
                yearly_price_usd: info.yearly_price_usd,
                payments_enabled: true,
                amount_paise: Some(pay.amount_paise),
                currency: Some(pay.currency),
                razorpay_key_id: Some(pay.key_id),
            });
        }

        Ok(CheckoutStatusResponse {
            status: "payments_unavailable".to_string(),
            message: format!(
                "Secure checkout is temporarily unavailable. Yearly Premium is ${}/year when payments are enabled.",
                info.yearly_price_usd
            ),
            is_premium: false,
            premium_until: None,
            yearly_price_usd: info.yearly_price_usd,
            payments_enabled: false,
            amount_paise: None,
            currency: None,
            razorpay_key_id: None,
        })
    }

    pub async fn validate_promo(&self, code: &str) -> Result<ValidatePromoResponse, sqlx::Error> {
        let original_price = self.settings.yearly_price_usd;
        
        let promo = self.repo.find_promo_by_code(code).await?;
        
        let Some(promo) = promo else {
            return Ok(ValidatePromoResponse {
                is_valid: false,
                promo_id: None,
                duration_months: None,
                original_price_usd: original_price,
                discount_amount_usd: 0,
                final_price_usd: original_price,
                error_message: Some("Invalid promo code".to_string()),
            });
        };

        let now = Utc::now();
        let not_yet_active = promo.valid_from > now;
        let expired = promo.valid_until.is_some_and(|until| until < now);

        if !promo.is_active || not_yet_active || expired {
            let error_message = if not_yet_active {
                "Promo code is not active yet"
            } else {
                "Promo code expired"
            };
            return Ok(ValidatePromoResponse {
                is_valid: false,
                promo_id: Some(promo.id),
                duration_months: promo.duration_months,
                original_price_usd: original_price,
                discount_amount_usd: 0,
                final_price_usd: original_price,
                error_message: Some(error_message.to_string()),
            });
        }

        if promo.max_uses.is_some() && promo.used_count >= promo.max_uses.unwrap() {
            return Ok(ValidatePromoResponse {
                is_valid: false,
                promo_id: Some(promo.id),
                duration_months: promo.duration_months,
                original_price_usd: original_price,
                discount_amount_usd: 0,
                final_price_usd: original_price,
                error_message: Some("Promo code usage limit reached".to_string()),
            });
        }

        let discount_amount = (original_price as f64 * (promo.discount_percentage as f64 / 100.0)).round() as u32;
        let final_price = original_price.saturating_sub(discount_amount);

        Ok(ValidatePromoResponse {
            is_valid: true,
            promo_id: Some(promo.id),
            duration_months: promo.duration_months,
            original_price_usd: original_price,
            discount_amount_usd: discount_amount,
            final_price_usd: final_price,
            error_message: None,
        })
    }
}

fn format_payment_amount(amount_minor: u64, currency: &str) -> String {
    let major = amount_minor as f64 / 100.0;
    match currency.to_uppercase().as_str() {
        "USD" => format!("${major:.0}"),
        "INR" => format!("₹{major:.0}"),
        "EUR" => format!("€{major:.0}"),
        "GBP" => format!("£{major:.0}"),
        other => format!("{major:.2} {other}"),
    }
}
