use serde::Deserialize;
use sha2::{Digest, Sha256};

const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const GOOGLE_TOKENINFO_URL: &str = "https://oauth2.googleapis.com/tokeninfo";

#[derive(Clone)]
pub struct GoogleOAuthConfig {
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
    pub signing_key: String,
}

#[derive(Debug, Clone)]
pub struct GoogleUserInfo {
    pub sub: String,
    pub email: String,
    pub name: String,
    pub email_verified: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum GoogleAuthError {
    #[error("Google OAuth is not configured")]
    NotConfigured,

    #[error("Invalid OAuth state")]
    InvalidState,

    #[error("Google token exchange failed")]
    TokenExchangeFailed,

    #[error("Invalid Google ID token")]
    InvalidIdToken,

    #[error("Google email not verified")]
    EmailNotVerified,

    #[error("HTTP error: {0}")]
    HttpError(String),
}

pub struct GoogleOAuthClient {
    config: GoogleOAuthConfig,
    http: reqwest::Client,
}

impl GoogleOAuthClient {
    pub fn new(config: GoogleOAuthConfig) -> Self {
        Self {
            config,
            http: reqwest::Client::new(),
        }
    }

    pub fn authorization_url(&self, state: &str) -> String {
        let scope = urlencoding::encode("openid email profile");
        format!(
            "{GOOGLE_AUTH_URL}?client_id={}&redirect_uri={}&response_type=code&scope={scope}&access_type=online&prompt=select_account&state={}",
            urlencoding::encode(&self.config.client_id),
            urlencoding::encode(&self.config.redirect_uri),
            urlencoding::encode(state),
        )
    }

    pub fn encode_state(&self, redirect_to: &str, role: &str) -> String {
        let exp = chrono::Utc::now().timestamp() + 600;
        let payload = serde_json::json!({
            "redirect_to": redirect_to,
            "role": role,
            "exp": exp,
            "nonce": uuid::Uuid::new_v4().to_string(),
        });
        let payload_b64 = base64::Engine::encode(
            &base64::engine::general_purpose::URL_SAFE_NO_PAD,
            payload.to_string().as_bytes(),
        );
        let sig = self.sign_payload(&payload_b64);
        format!("{payload_b64}.{sig}")
    }

    pub fn decode_state(&self, state: &str) -> Result<(String, String), GoogleAuthError> {
        let (payload_b64, sig) = state
            .rsplit_once('.')
            .ok_or(GoogleAuthError::InvalidState)?;
        if self.sign_payload(payload_b64) != sig {
            return Err(GoogleAuthError::InvalidState);
        }
        let payload_bytes = base64::Engine::decode(
            &base64::engine::general_purpose::URL_SAFE_NO_PAD,
            payload_b64,
        )
        .map_err(|_| GoogleAuthError::InvalidState)?;
        let payload: serde_json::Value = serde_json::from_slice(&payload_bytes)
            .map_err(|_| GoogleAuthError::InvalidState)?;
        let exp = payload
            .get("exp")
            .and_then(|v| v.as_i64())
            .ok_or(GoogleAuthError::InvalidState)?;
        if chrono::Utc::now().timestamp() > exp {
            return Err(GoogleAuthError::InvalidState);
        }
        let redirect_to = payload
            .get("redirect_to")
            .and_then(|v| v.as_str())
            .ok_or(GoogleAuthError::InvalidState)?
            .to_string();
        let role = payload
            .get("role")
            .and_then(|v| v.as_str())
            .unwrap_or("user")
            .to_string();
        Ok((redirect_to, role))
    }

    pub async fn exchange_code(&self, code: &str) -> Result<GoogleUserInfo, GoogleAuthError> {
        let response = self
            .http
            .post(GOOGLE_TOKEN_URL)
            .form(&[
                ("code", code),
                ("client_id", self.config.client_id.as_str()),
                ("client_secret", self.config.client_secret.as_str()),
                ("redirect_uri", self.config.redirect_uri.as_str()),
                ("grant_type", "authorization_code"),
            ])
            .send()
            .await
            .map_err(|e| GoogleAuthError::HttpError(e.to_string()))?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            log::warn!("Google token exchange failed: {body}");
            return Err(GoogleAuthError::TokenExchangeFailed);
        }

        let token_response: GoogleTokenResponse = response
            .json()
            .await
            .map_err(|e| GoogleAuthError::HttpError(e.to_string()))?;

        self.verify_id_token(&token_response.id_token).await
    }

    pub async fn verify_id_token(&self, id_token: &str) -> Result<GoogleUserInfo, GoogleAuthError> {
        let response = self
            .http
            .get(GOOGLE_TOKENINFO_URL)
            .query(&[("id_token", id_token)])
            .send()
            .await
            .map_err(|e| GoogleAuthError::HttpError(e.to_string()))?;

        if !response.status().is_success() {
            return Err(GoogleAuthError::InvalidIdToken);
        }

        let info: GoogleTokenInfo = response
            .json()
            .await
            .map_err(|e| GoogleAuthError::HttpError(e.to_string()))?;

        if info.aud != self.config.client_id {
            return Err(GoogleAuthError::InvalidIdToken);
        }

        let email_verified = info.email_verified == "true" || info.email_verified == "1";
        if !email_verified {
            return Err(GoogleAuthError::EmailNotVerified);
        }

        let name = if info.name.trim().is_empty() {
            info.email.split('@').next().unwrap_or("User").to_string()
        } else {
            info.name
        };

        Ok(GoogleUserInfo {
            sub: info.sub,
            email: info.email,
            name,
            email_verified: true,
        })
    }

    fn sign_payload(&self, payload_b64: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(self.config.signing_key.as_bytes());
        hasher.update(b":google-oauth:");
        hasher.update(payload_b64.as_bytes());
        hex::encode(hasher.finalize())
    }
}

#[derive(Debug, Deserialize)]
struct GoogleTokenResponse {
    id_token: String,
}

#[derive(Debug, Deserialize)]
struct GoogleTokenInfo {
    sub: String,
    email: String,
    #[serde(default)]
    name: String,
    aud: String,
    email_verified: String,
}
