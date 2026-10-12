use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

// ===== REQUEST/RESPONSE MODELS =====

#[derive(Debug, Clone, Serialize)]
pub struct AdminOverview {
    pub total_users: i64,
    pub signups_7d: i64,
    pub total_candidates: i64,
    pub total_recruiters: i64,
    pub resumes_uploaded: i64,
    pub active_jobs: i64,
    pub applications_total: i64,
    pub applications_7d: i64,
    pub premium_subscribers: i64,
    pub premium_conversions_7d: i64,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct AdminUserRow {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub role: String,
    pub email_verified: bool,
    pub is_premium_candidate: bool,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct ReferralSettingsRow {
    pub credits_per_referral: i32,
    pub credits_required_for_redemption: i32,
    pub redemption_premium_months: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub name: String,
    pub email: String,
    pub password: String,
    pub role: String, // "user", "admin", etc.
    #[serde(default)]
    pub referral_code: Option<String>,
    /// No `#[serde(default)]` on purpose — omitting the field entirely fails
    /// closed with a deserialize error rather than silently defaulting to
    /// unaccepted (or, worse, accepted).
    pub terms_accepted: bool,
    /// Optional: the mobile app has no Turnstile widget and can't provide
    /// one. Only enforced server-side when BFF__TURNSTILE__SECRET_KEY is set.
    #[serde(default)]
    pub turnstile_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterResponse {
    pub user_id: Uuid,
    pub email: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    #[serde(default)]
    pub turnstile_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoogleLoginRequest {
    pub id_token: String,
    #[serde(default = "default_user_role")]
    pub role: String,
    pub referral_code: Option<String>,
}

fn default_user_role() -> String {
    "user".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user: UserProfile,
    pub expires_in: i64, // seconds
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefreshTokenRequest {
    /// Optional because the web client no longer has this value to send —
    /// it lives in an httpOnly cookie. Mobile still sends it explicitly.
    #[serde(default)]
    pub refresh_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefreshTokenResponse {
    pub access_token: String,
    pub refresh_token: String, // new refresh token
    pub expires_in: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogoutRequest {
    /// Optional for the same reason as `RefreshTokenRequest` — the web
    /// client's refresh token lives in an httpOnly cookie, not JS-readable state.
    #[serde(default)]
    pub refresh_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyEmailRequest {
    pub token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestPasswordResetRequest {
    pub email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub new_password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProfileRequest {
    pub name: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub role: String,
    pub email_verified: bool,
    pub created_at: NaiveDateTime,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscription: Option<crate::module::subscription::model::SubscriptionInfo>,
    #[serde(default)]
    pub referral_code: Option<String>,
    #[serde(default)]
    pub successful_referrals: Option<i64>,
    #[serde(default)]
    pub referral_credits: i32,
    pub is_premium_candidate: bool,
}

// ===== JWT TOKEN MODELS =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenClaims {
    pub sub: String, // user_id
    pub email: String,
    pub role: String,
    pub exp: i64, // expiration timestamp
    pub iat: i64, // issued at timestamp
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub email: String,
    pub role: String,
}

// ===== DATABASE MODELS =====

#[derive(Debug, Clone)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub password_hash: Option<String>,
    pub name: String,
    pub role: String,
    pub email_verified: bool,
    pub google_sub: Option<String>,
    pub email_verification_token: Option<String>,
    pub email_verification_expires_at: Option<NaiveDateTime>,
    pub password_reset_token: Option<String>,
    pub password_reset_expires_at: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub referral_code: Option<String>,
    pub referred_by: Option<Uuid>,
    pub referral_credits: i32,
    pub is_premium_candidate: bool,
    pub deleted_at: Option<NaiveDateTime>,
    pub terms_accepted_at: Option<NaiveDateTime>,
}

impl User {
    pub fn is_deleted(&self) -> bool {
        self.deleted_at.is_some()
    }

    /// Frees the unique email so the same address can register again.
    pub fn archived_email(user_id: Uuid) -> String {
        format!("deleted_{user_id}@archived.kraftisium.internal")
    }

    /// Fits VARCHAR(20) UNIQUE on referral_code.
    pub fn archived_referral_code(user_id: Uuid) -> String {
        let hex = user_id.simple().to_string();
        format!("d{}", &hex[..19])
    }

    pub fn from_row(row: &sqlx::postgres::PgRow) -> Result<Self, sqlx::Error> {
        Ok(Self {
            id: row.try_get("id")?,
            email: row.try_get("email")?,
            password_hash: row.try_get("password_hash")?,
            name: row.try_get("name")?,
            role: row.try_get("role")?,
            email_verified: row.try_get("email_verified")?,
            google_sub: row.try_get("google_sub")?,
            email_verification_token: row.try_get("email_verification_token")?,
            email_verification_expires_at: row.try_get("email_verification_expires_at")?,
            password_reset_token: row.try_get("password_reset_token")?,
            password_reset_expires_at: row.try_get("password_reset_expires_at")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
            referral_code: row.try_get("referral_code").unwrap_or(None),
            referred_by: row.try_get("referred_by").unwrap_or(None),
            referral_credits: row.try_get("referral_credits").unwrap_or(0),
            is_premium_candidate: row.try_get("is_premium_candidate").unwrap_or(false),
            deleted_at: row.try_get("deleted_at").unwrap_or(None),
            terms_accepted_at: row.try_get("terms_accepted_at").unwrap_or(None),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn archived_identifiers_free_login_fields() {
        let id = Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap();
        assert_eq!(
            User::archived_email(id),
            "deleted_550e8400-e29b-41d4-a716-446655440000@archived.kraftisium.internal"
        );
        let code = User::archived_referral_code(id);
        assert_eq!(code.len(), 20);
        assert!(code.starts_with('d'));
    }
}

#[derive(Debug, Clone)]
pub struct RefreshToken {
    pub id: Uuid,
    pub user_id: Uuid,
    pub token_hash: String,
    // DB schema uses TIMESTAMP (no timezone), so we store/load as NaiveDateTime
    pub expires_at: NaiveDateTime,
    pub created_at: NaiveDateTime,
}

impl RefreshToken {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> Result<Self, sqlx::Error> {
        Ok(Self {
            id: row.try_get("id")?,
            user_id: row.try_get("user_id")?,
            token_hash: row.try_get("token_hash")?,
            expires_at: row.try_get("expires_at")?,
            created_at: row.try_get("created_at")?,
        })
    }
}

#[derive(Debug, Clone)]
pub struct TokenBlacklist {
    pub id: Uuid,
    pub token_hash: String,
    // DB schema uses TIMESTAMP (no timezone)
    pub expires_at: NaiveDateTime,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreditTransaction {
    pub id: Uuid,
    pub user_id: Uuid,
    pub amount: i32,
    pub reason: String,
    pub created_at: NaiveDateTime,
}

// ===== CACHE MODELS =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedUser {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub role: String,
    pub email_verified: bool,
    pub created_at: NaiveDateTime,
    pub referral_code: Option<String>,
    pub referral_credits: i32,
    pub is_premium_candidate: bool,
}

// ===== ERROR MODELS =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("User already exists")]
    UserAlreadyExists,

    #[error("You must accept the Terms of Service to register")]
    TermsNotAccepted,

    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("User not found")]
    UserNotFound,

    #[error("Token expired")]
    TokenExpired,

    #[error("Invalid token")]
    InvalidToken,

    #[error("Token blacklisted")]
    TokenBlacklisted,

    #[error("Too many login attempts")]
    TooManyLoginAttempts,

    #[error("Email not verified")]
    EmailNotVerified,

    #[error("Invalid verification token")]
    InvalidVerificationToken,

    #[error("Password hashing error")]
    PasswordHashingError,

    #[error("Token creation error")]
    TokenCreationError,

    #[error("Google OAuth is not configured")]
    OAuthNotConfigured,

    #[error("Google authentication failed")]
    GoogleAuthFailed,

    #[error("OAuth-only account")]
    OAuthOnlyAccount,

    #[error("Account already deleted")]
    AccountAlreadyDeleted,

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Cache error: {0}")]
    CacheError(String),

    #[error("CAPTCHA verification failed")]
    TurnstileFailed,
}
