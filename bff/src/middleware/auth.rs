use actix_web::cookie::{Cookie, SameSite, time::Duration as CookieDuration};
use actix_web::{HttpRequest, HttpResponse};
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode};
use serde::{Deserialize, Serialize};
use sha2::Digest;
use uuid::Uuid;

// ===== AUTH COOKIES =====
//
// The web client authenticates via httpOnly cookies instead of reading
// tokens out of JSON and holding them in localStorage (XSS-exfiltrable).
// The mobile app is untouched: it keeps sending/receiving tokens in the
// JSON body and a Bearer header, since httpOnly cookies don't fit a native
// app well. Every endpoint below accepts *either* — see `extract_access_token`
// and the cookie fallback added to login/refresh/logout.
pub const ACCESS_COOKIE_NAME: &str = "kraftisium_access_token";
pub const REFRESH_COOKIE_NAME: &str = "kraftisium_refresh_token";
/// Refresh cookie is scoped to this path so the browser only ever sends the
/// long-lived credential to the couple of endpoints that need it.
pub const REFRESH_COOKIE_PATH: &str = "/api/v1/auth";

fn base_cookie<'a>(name: &'a str, value: String, secure: bool) -> actix_web::cookie::CookieBuilder<'a> {
    Cookie::build(name, value)
        .http_only(true)
        .secure(secure)
        .same_site(SameSite::Lax)
}

pub fn access_token_cookie(token: String, max_age_secs: i64, secure: bool) -> Cookie<'static> {
    base_cookie(ACCESS_COOKIE_NAME, token, secure)
        .path("/")
        .max_age(CookieDuration::seconds(max_age_secs.max(0)))
        .finish()
        .into_owned()
}

pub fn refresh_token_cookie(token: String, max_age_secs: i64, secure: bool) -> Cookie<'static> {
    base_cookie(REFRESH_COOKIE_NAME, token, secure)
        .path(REFRESH_COOKIE_PATH)
        .max_age(CookieDuration::seconds(max_age_secs.max(0)))
        .finish()
        .into_owned()
}

/// Expired cookies that overwrite and delete the client's copies (used on logout).
pub fn clear_auth_cookies(secure: bool) -> [Cookie<'static>; 2] {
    [
        base_cookie(ACCESS_COOKIE_NAME, String::new(), secure)
            .path("/")
            .max_age(CookieDuration::seconds(0))
            .finish()
            .into_owned(),
        base_cookie(REFRESH_COOKIE_NAME, String::new(), secure)
            .path(REFRESH_COOKIE_PATH)
            .max_age(CookieDuration::seconds(0))
            .finish()
            .into_owned(),
    ]
}

/// Bearer header takes priority (mobile, scripts); falls back to the httpOnly
/// cookie (web). Used both by the request-time JWT check and by the
/// blacklist-check middleware, so they always agree on which token is "the" token.
pub fn extract_access_token(req: &HttpRequest) -> Option<String> {
    if let Some(h) = req.headers().get("Authorization").and_then(|v| v.to_str().ok()) {
        if let Some(t) = h.strip_prefix("Bearer ") {
            if !t.is_empty() {
                return Some(t.to_string());
            }
        }
    }
    req.cookie(ACCESS_COOKIE_NAME).map(|c| c.value().to_string())
}

/// Same idea for the refresh token: JSON body (mobile) or the scoped cookie (web).
pub fn extract_refresh_token(req: &HttpRequest, body_token: Option<&str>) -> Option<String> {
    if let Some(t) = body_token {
        if !t.trim().is_empty() {
            return Some(t.to_string());
        }
    }
    req.cookie(REFRESH_COOKIE_NAME).map(|c| c.value().to_string())
}

/// Keyed fingerprint used to look tokens up in the blacklist without storing
/// the raw token. Shared by `AuthService` (writes on logout) and the
/// blacklist-check middleware (reads on every request) — they must agree on
/// the exact same hash or revocation silently stops working.
pub fn token_fingerprint(jwt_secret: &str, token: &str) -> String {
    let mut hasher = sha2::Sha256::new();
    hasher.update(jwt_secret.as_bytes());
    hasher.update(b":");
    hasher.update(token.as_bytes());
    hex::encode(hasher.finalize())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenClaims {
    pub sub: String,
    pub email: String,
    pub role: String,
    pub exp: i64,
    pub iat: i64,
}

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub role: String,
}

pub fn extract_auth_user(req: &HttpRequest, jwt_secret: &str) -> Result<AuthUser, HttpResponse> {
    let token = extract_access_token(req).ok_or_else(|| {
        HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "Unauthorized",
            "message": "Authorization header with Bearer token, or auth cookie, required"
        }))
    })?;

    let decoding_key = DecodingKey::from_secret(jwt_secret.as_ref());
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;

    let token_data = decode::<TokenClaims>(&token, &decoding_key, &validation).map_err(|e| {
        log::debug!("JWT validation failed: {}", e);
        HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "Unauthorized",
            "message": "Invalid or expired token"
        }))
    })?;

    let user_id = Uuid::parse_str(&token_data.claims.sub).map_err(|_| {
        HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "Unauthorized",
            "message": "Invalid token claims"
        }))
    })?;

    Ok(AuthUser {
        user_id,
        role: token_data.claims.role,
    })
}

pub fn require_role(auth: &AuthUser, allowed_roles: &[&str]) -> Result<(), HttpResponse> {
    if allowed_roles.iter().any(|r| *r == auth.role) {
        Ok(())
    } else {
        Err(HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Forbidden",
            "message": "Insufficient permissions for this action"
        })))
    }
}
