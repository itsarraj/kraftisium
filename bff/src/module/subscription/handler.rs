use crate::configuration::Settings;
use crate::middleware::auth;
use crate::module::payments::service::PaymentService;
use crate::module::subscription::model::PaymentCheckoutInfo;
use crate::module::subscription::service::SubscriptionService;
use actix_web::{HttpRequest, HttpResponse, Responder, web};
use serde::Deserialize;
use std::sync::Arc;

#[derive(Deserialize)]
pub struct ValidatePromoQuery {
    pub code: String,
}

pub async fn get_promo_banner(service: web::Data<Arc<SubscriptionService>>) -> impl Responder {
    match service.promo_banner().await {
        Ok(info) => HttpResponse::Ok().json(info),
        Err(e) => {
            log::error!("promo banner: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn get_checkout_status(
    service: web::Data<Arc<SubscriptionService>>,
    payment_service: web::Data<Arc<PaymentService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };

    let payment = payment_service.checkout_meta().map(
        |(amount_paise, currency, key_id)| PaymentCheckoutInfo {
            amount_paise,
            currency,
            key_id,
        },
    );

    match service.checkout_status(auth.user_id, payment).await {
        Ok(body) => HttpResponse::Ok().json(body),
        Err(e) => {
            log::error!("checkout status: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn post_checkout(
    service: web::Data<Arc<SubscriptionService>>,
    payment_service: web::Data<Arc<PaymentService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
) -> impl Responder {
    get_checkout_status(service, payment_service, config, req).await
}

pub async fn get_promo_validate(
    service: web::Data<Arc<SubscriptionService>>,
    query: web::Query<ValidatePromoQuery>,
) -> impl Responder {
    match service.validate_promo(&query.code).await {
        Ok(info) => HttpResponse::Ok().json(info),
        Err(e) => {
            log::error!("promo validate: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn get_referral_settings(service: web::Data<Arc<SubscriptionService>>) -> impl Responder {
    match service.referral_settings().await {
        Ok(settings) => HttpResponse::Ok().json(settings),
        Err(e) => {
            log::error!("referral settings: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn post_redeem_credits(
    service: web::Data<Arc<SubscriptionService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };

    match service.redeem_credits(auth.user_id).await {
        Ok(months) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "message": format!("Successfully redeemed credits for {} month{} of Premium", months, if months == 1 { "" } else { "s" })
        })),
        Err(e) => {
            log::error!("redeem credits: {}", e);
            HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}
