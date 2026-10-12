use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOrderRequest {
    pub promo_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOrderResponse {
    pub order_id: String,
    pub amount: u64,
    pub currency: String,
    pub key_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyPaymentRequest {
    pub razorpay_order_id: String,
    pub razorpay_payment_id: String,
    pub razorpay_signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyPaymentResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentErrorResponse {
    pub error: String,
    pub message: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum PaymentError {
    #[error("Razorpay is not configured")]
    NotConfigured,

    #[error("Invalid amount")]
    InvalidAmount,

    #[error("Razorpay API error")]
    RazorpayApiError,

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Invalid signature")]
    InvalidSignature,

    #[error("Missing payment fields")]
    MissingFields,

    #[error("Already subscribed")]
    AlreadySubscribed,

    #[error("Database error: {0}")]
    DatabaseError(String),
}
