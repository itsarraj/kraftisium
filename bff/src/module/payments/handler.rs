use crate::configuration::Settings;
use crate::middleware::auth;
use crate::module::payments::{model::*, service::PaymentService};
use actix_web::{HttpRequest, HttpResponse, Responder, web};
use std::sync::Arc;

fn payment_error_response(err: PaymentError) -> HttpResponse {
    match err {
        PaymentError::NotConfigured => HttpResponse::ServiceUnavailable().json(PaymentErrorResponse {
            error: "PaymentsNotConfigured".to_string(),
            message: Some("Razorpay is not configured on this server".to_string()),
        }),
        PaymentError::InvalidAmount => HttpResponse::BadRequest().json(PaymentErrorResponse {
            error: "InvalidAmount".to_string(),
            message: Some("Amount must be at least 100 minor currency units".to_string()),
        }),
        PaymentError::Unauthorized => HttpResponse::Unauthorized().json(PaymentErrorResponse {
            error: "RazorpayUnauthorized".to_string(),
            message: Some(
                "Invalid Razorpay API credentials. Regenerate a matching Key ID + Key Secret in Razorpay Dashboard (test mode) and update BFF__RAZORPAY__* in bff/.env"
                    .to_string(),
            ),
        }),
        PaymentError::RazorpayApiError => HttpResponse::InternalServerError().json(PaymentErrorResponse {
            error: "RazorpayApiError".to_string(),
            message: Some("Failed to create payment order".to_string()),
        }),
        PaymentError::InvalidSignature => HttpResponse::BadRequest().json(PaymentErrorResponse {
            error: "InvalidSignature".to_string(),
            message: Some("Payment signature verification failed".to_string()),
        }),
        PaymentError::MissingFields => HttpResponse::BadRequest().json(PaymentErrorResponse {
            error: "MissingFields".to_string(),
            message: Some(
                "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required"
                    .to_string(),
            ),
        }),
        PaymentError::AlreadySubscribed => HttpResponse::Conflict().json(PaymentErrorResponse {
            error: "AlreadySubscribed".to_string(),
            message: Some("You already have an active Premium subscription".to_string()),
        }),
        PaymentError::DatabaseError(msg) => {
            log::error!("payment database error: {msg}");
            HttpResponse::InternalServerError().json(PaymentErrorResponse {
                error: "DatabaseError".to_string(),
                message: Some("Failed to process payment".to_string()),
            })
        }
    }
}

// POST /api/v1/payments/create-order
pub async fn create_order(
    payment_service: web::Data<Arc<PaymentService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    body: Option<web::Json<CreateOrderRequest>>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };

    let promo_code = body.and_then(|b| b.into_inner().promo_code);

    match payment_service.create_order(auth.user_id, promo_code).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => payment_error_response(e),
    }
}

// POST /api/v1/payments/verify-payment
pub async fn verify_payment(
    payment_service: web::Data<Arc<PaymentService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    body: web::Json<VerifyPaymentRequest>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };

    let body = body.into_inner();
    match payment_service
        .verify_payment(
            auth.user_id,
            &body.razorpay_order_id,
            &body.razorpay_payment_id,
            &body.razorpay_signature,
        )
        .await
    {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => payment_error_response(e),
    }
}

// POST /api/v1/payments/webhook — Razorpay server-to-server (no auth; signature verified)
pub async fn razorpay_webhook(
    payment_service: web::Data<Arc<PaymentService>>,
    req: HttpRequest,
    body: web::Bytes,
) -> impl Responder {
    let signature = req
        .headers()
        .get("X-Razorpay-Signature")
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();

    match payment_service.handle_webhook(body.as_ref(), signature).await {
        Ok(()) => HttpResponse::Ok().json(serde_json::json!({ "status": "ok" })),
        Err(PaymentError::InvalidSignature) => {
            HttpResponse::BadRequest().json(PaymentErrorResponse {
                error: "InvalidSignature".to_string(),
                message: Some("Webhook signature verification failed".to_string()),
            })
        }
        Err(e) => payment_error_response(e),
    }
}
