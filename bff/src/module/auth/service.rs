use crate::module::auth::{cache::*, google::*, model::*, repository::*};
use crate::module::email::service::EmailService;
use crate::module::subscription::service::SubscriptionService;
use bcrypt::{DEFAULT_COST, hash, verify};
use chrono::{Duration, Utc};
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation, decode, encode};
use rand::Rng;
use std::sync::Arc;
use uuid::Uuid;

pub struct AuthService {
    user_repo: Arc<UserRepository>,
    refresh_token_repo: Arc<RefreshTokenRepository>,
    blacklist_repo: Arc<TokenBlacklistRepository>,
    cache: Arc<AuthCache>,
    email_service: Arc<EmailService>,
    subscription_service: Option<Arc<SubscriptionService>>,
    google_oauth: Option<GoogleOAuthClient>,
    jwt_secret: String,
    access_token_expiration_hours: i64,
    refresh_token_expiration_days: i64,
    cookie_secure: bool,
    require_email_verification: bool,
    turnstile_secret_key: Option<String>,
    turnstile_hostnames: Vec<String>,
    http: reqwest::Client,
}

impl AuthService {
    pub fn new(
        user_repo: UserRepository,
        refresh_token_repo: RefreshTokenRepository,
        blacklist_repo: TokenBlacklistRepository,
        cache: AuthCache,
        email_service: EmailService,
        subscription_service: Option<Arc<SubscriptionService>>,
        google_oauth: Option<GoogleOAuthClient>,
        jwt_secret: String,
        access_token_expiration_hours: i64,
        refresh_token_expiration_days: i64,
        cookie_secure: bool,
        require_email_verification: bool,
        turnstile_secret_key: Option<String>,
        turnstile_hostnames: Vec<String>,
    ) -> Self {
        Self {
            user_repo: Arc::new(user_repo),
            refresh_token_repo: Arc::new(refresh_token_repo),
            blacklist_repo: Arc::new(blacklist_repo),
            cache: Arc::new(cache),
            email_service: Arc::new(email_service),
            subscription_service,
            google_oauth,
            jwt_secret,
            access_token_expiration_hours,
            refresh_token_expiration_days,
            cookie_secure,
            require_email_verification,
            turnstile_secret_key,
            turnstile_hostnames,
            http: reqwest::Client::new(),
        }
    }

    /// No-op unless BFF__TURNSTILE__SECRET_KEY is configured -- see
    /// `configuration::TurnstileSettings`. When configured, a missing token,
    /// a failed siteverify, a mismatched action, or a hostname outside
    /// BFF__TURNSTILE__HOSTNAMES fails closed.
    async fn verify_turnstile(
        &self,
        token: Option<&str>,
        expected_action: &str,
        remote_ip: Option<&str>,
    ) -> Result<(), AuthError> {
        let Some(secret_key) = self
            .turnstile_secret_key
            .as_deref()
            .filter(|key| !key.is_empty())
        else {
            return Ok(());
        };
        let Some(token) = token.filter(|token| !token.is_empty()) else {
            return Err(AuthError::TurnstileFailed);
        };
        match crate::module::turnstile::verify(
            &self.http,
            secret_key,
            token,
            remote_ip,
            expected_action,
            &self.turnstile_hostnames,
        )
        .await
        {
            Ok(true) => Ok(()),
            Ok(false) => Err(AuthError::TurnstileFailed),
            Err(e) => {
                log::error!("Turnstile siteverify request failed: {e}");
                Err(AuthError::TurnstileFailed)
            }
        }
    }

    /// Whether auth cookies should be marked `Secure` (i.e. we're serving over
    /// HTTPS). Derived once at startup from the configured frontend URL.
    pub fn cookie_secure(&self) -> bool {
        self.cookie_secure
    }

    pub fn refresh_token_expiration_days(&self) -> i64 {
        self.refresh_token_expiration_days
    }

    fn google_client(&self) -> Result<&GoogleOAuthClient, AuthError> {
        self.google_oauth.as_ref().ok_or(AuthError::OAuthNotConfigured)
    }

    fn normalize_role(role: &str) -> String {
        match role {
            "recruiter" | "admin" | "moderator" => role.to_string(),
            _ => "user".to_string(),
        }
    }

    async fn subscription_info(
        &self,
        user_id: Uuid,
    ) -> Option<crate::module::subscription::model::SubscriptionInfo> {
        if let Some(ref svc) = self.subscription_service {
            svc.build_info(user_id).await.ok()
        } else {
            None
        }
    }

    // ===== REGISTRATION =====

    pub async fn register(
        &self,
        request: RegisterRequest,
        remote_ip: Option<&str>,
    ) -> Result<RegisterResponse, AuthError> {
        self.verify_turnstile(request.turnstile_token.as_deref(), "signup", remote_ip)
            .await?;

        if !request.terms_accepted {
            return Err(AuthError::TermsNotAccepted);
        }

        // Check if user already exists
        if self
            .user_repo
            .find_by_email(&request.email)
            .await?
            .is_some()
        {
            return Err(AuthError::UserAlreadyExists);
        }

        // Validate password strength (basic check)
        if request.password.len() < 8 {
            return Err(AuthError::InvalidCredentials); // Could create a specific error type
        }

        // Hash password
        let password_hash =
            hash(request.password, DEFAULT_COST).map_err(|_| AuthError::PasswordHashingError)?;

        // Generate a raw verification token for the email link and only persist its fingerprint.
        let verification_token = self.generate_secure_token();
        let verification_token_hash = self.token_fingerprint(&verification_token);
        let verification_expires_at = (Utc::now() + Duration::hours(24)).naive_utc();

        let mut referred_by = None;
        if let Some(ref code) = request.referral_code {
            if !code.trim().is_empty() {
                if let Ok(Some(referrer)) = self.user_repo.find_by_referral_code(code).await {
                    referred_by = Some(referrer.id);
                }
            }
        }

        let mut my_referral_code;
        loop {
            my_referral_code = rand::thread_rng()
                .sample_iter(&rand::distributions::Alphanumeric)
                .take(8)
                .map(char::from)
                .collect::<String>()
                .to_uppercase();
            if self.user_repo.find_by_referral_code(&my_referral_code).await?.is_none() {
                break;
            }
        }

        let email_verified = !self.require_email_verification;
        let user = User {
            id: Uuid::new_v4(),
            email: request.email.clone(),
            password_hash: Some(password_hash),
            name: request.name,
            role: request.role,
            email_verified,
            google_sub: None,
            email_verification_token: if email_verified {
                None
            } else {
                Some(verification_token_hash)
            },
            email_verification_expires_at: if email_verified {
                None
            } else {
                Some(verification_expires_at)
            },
            password_reset_token: None,
            password_reset_expires_at: None,
            created_at: Utc::now().naive_utc(),
            updated_at: Utc::now().naive_utc(),
            referral_code: Some(my_referral_code),
            referred_by,
            referral_credits: 0,
            is_premium_candidate: false,
            deleted_at: None,
            terms_accepted_at: Some(Utc::now().naive_utc()),
        };

        self.user_repo.create_user(&user).await?;

        // Email verification is optional — only send/require it when configured.
        if self.require_email_verification {
            if let Err(e) = self
                .email_service
                .send_verification_email(&user.email, &verification_token, None)
                .await
            {
                eprintln!("Failed to send verification email: {:?}", e);
                // Don't fail registration if email fails, but log it
            }
        }

        let message = if self.require_email_verification {
            "User registered successfully. Please check your email to verify your account."
        } else {
            "User registered successfully. You can log in now."
        };

        Ok(RegisterResponse {
            user_id: user.id,
            email: user.email,
            message: message.to_string(),
        })
    }

    // ===== EMAIL VERIFICATION =====

    pub async fn verify_email(&self, token: &str) -> Result<(), AuthError> {
        if token.trim().is_empty() {
            return Err(AuthError::InvalidVerificationToken);
        }

        let token_hash = self.token_fingerprint(token);
        let user = self
            .user_repo
            .find_by_verification_token(&token_hash)
            .await?
            .ok_or(AuthError::InvalidVerificationToken)?;

        if user.email_verified {
            log::info!("Email already verified for user {}", user.id);
            return Ok(());
        }

        self.user_repo.update_email_verified(user.id, true).await?;

        let cache = self.cache.clone();
        let user_id = user.id;
        tokio::spawn(async move {
            let _ = cache.invalidate_user(user_id).await;
        });

        if let Some(ref sub) = self.subscription_service {
            if let Err(e) = sub
                .grant_on_email_verified(user.id, &user.email, &user.name)
                .await
            {
                log::warn!(
                    "Founding premium grant after verify failed for {}: {}",
                    user.id,
                    e
                );
            }
        }

        log::info!("Email verified for user {}", user.id);
        Ok(())
    }

    // ===== LOGIN =====

    pub async fn login(
        &self,
        request: LoginRequest,
        remote_ip: Option<&str>,
    ) -> Result<LoginResponse, AuthError> {
        self.verify_turnstile(request.turnstile_token.as_deref(), "login", remote_ip)
            .await?;

        // Rate limiting check
        let attempts = self.cache.get_login_attempts(&request.email).await?;
        if attempts >= 5 {
            return Err(AuthError::TooManyLoginAttempts);
        }

        // Find user
        let user = self
            .user_repo
            .find_by_email(&request.email)
            .await?
            .ok_or_else(|| {
                // Increment attempts even for non-existent users (security)
                let _ = self.cache.increment_login_attempts(&request.email);
                AuthError::InvalidCredentials
            })?;

        if user.is_deleted() {
            return Err(AuthError::InvalidCredentials);
        }

        // Check if email is verified
        if self.require_email_verification && !user.email_verified {
            return Err(AuthError::EmailNotVerified);
        }

        let password_hash = user
            .password_hash
            .as_ref()
            .ok_or(AuthError::InvalidCredentials)?;

        if !verify(&request.password, password_hash)
            .map_err(|_| AuthError::InvalidCredentials)?
        {
            self.cache.increment_login_attempts(&request.email).await?;
            return Err(AuthError::InvalidCredentials);
        }

        self.cache.reset_login_attempts(&request.email).await.ok();
        self.issue_login_response(&user).await
    }

    // ===== GOOGLE OAUTH =====

    pub fn decode_google_oauth_state(&self, state: &str) -> Result<(String, String), AuthError> {
        let client = self.google_client()?;
        client
            .decode_state(state)
            .map_err(|_| AuthError::GoogleAuthFailed)
    }

    pub fn google_authorization_url(
        &self,
        redirect_to: &str,
        role: &str,
    ) -> Result<String, AuthError> {
        let client = self.google_client()?;
        let role = Self::normalize_role(role);
        let state = client.encode_state(redirect_to, &role);
        Ok(client.authorization_url(&state))
    }

    pub async fn google_oauth_callback(
        &self,
        code: &str,
        state: &str,
    ) -> Result<(LoginResponse, String), AuthError> {
        let client = self.google_client()?;
        let (redirect_to, role) = client
            .decode_state(state)
            .map_err(|_| AuthError::GoogleAuthFailed)?;
        let google_user = client
            .exchange_code(code)
            .await
            .map_err(|e| {
                log::warn!("Google code exchange failed: {e}");
                AuthError::GoogleAuthFailed
            })?;
        let user = self
            .find_or_create_google_user(&google_user, &role)
            .await?;
        let login = self.issue_login_response(&user).await?;
        Ok((login, redirect_to))
    }

    pub async fn google_login_with_id_token(
        &self,
        request: GoogleLoginRequest,
    ) -> Result<LoginResponse, AuthError> {
        let client = self.google_client()?;
        let role = Self::normalize_role(&request.role);
        let google_user = client
            .verify_id_token(&request.id_token)
            .await
            .map_err(|e| {
                log::warn!("Google ID token verification failed: {e}");
                AuthError::GoogleAuthFailed
            })?;
        let user = self
            .find_or_create_google_user(&google_user, &role)
            .await?;
        self.issue_login_response(&user).await
    }

    async fn find_or_create_google_user(
        &self,
        google_user: &GoogleUserInfo,
        role: &str,
    ) -> Result<User, AuthError> {
        if let Some(user) = self
            .user_repo
            .find_by_google_sub(&google_user.sub)
            .await?
        {
            if !user.is_deleted() {
                return Ok(user);
            }
        }

        if let Some(mut user) = self
            .user_repo
            .find_by_email(&google_user.email)
            .await?
        {
            if !user.is_deleted() {
                if user.google_sub.is_none() {
                    self.user_repo
                        .link_google_sub(user.id, &google_user.sub)
                        .await?;
                    user.google_sub = Some(google_user.sub.clone());
                    user.email_verified = true;
                }
                return Ok(user);
            }
        }

        let mut my_referral_code;
        loop {
            my_referral_code = rand::thread_rng()
                .sample_iter(&rand::distributions::Alphanumeric)
                .take(8)
                .map(char::from)
                .collect::<String>()
                .to_uppercase();
            if self
                .user_repo
                .find_by_referral_code(&my_referral_code)
                .await?
                .is_none()
            {
                break;
            }
        }

        let user = User {
            id: Uuid::new_v4(),
            email: google_user.email.clone(),
            password_hash: None,
            name: google_user.name.clone(),
            role: role.to_string(),
            email_verified: true,
            google_sub: Some(google_user.sub.clone()),
            email_verification_token: None,
            email_verification_expires_at: None,
            password_reset_token: None,
            password_reset_expires_at: None,
            created_at: Utc::now().naive_utc(),
            updated_at: Utc::now().naive_utc(),
            referral_code: Some(my_referral_code),
            referred_by: None,
            referral_credits: 0,
            is_premium_candidate: false,
            deleted_at: None,
            // Google OAuth has no separate consent form step — creating an
            // account this way is gated on the same "By continuing you agree
            // to our Terms" disclaimer the frontend shows next to the button,
            // not a checkbox, so this is stamped rather than checked.
            terms_accepted_at: Some(Utc::now().naive_utc()),
        };

        let created = self.user_repo.create_user(&user).await?;

        if let Some(ref sub) = self.subscription_service {
            if let Err(e) = sub
                .grant_on_email_verified(created.id, &created.email, &created.name)
                .await
            {
                log::warn!(
                    "Founding premium grant after Google signup failed for {}: {}",
                    created.id,
                    e
                );
            }
        }

        Ok(created)
    }

    async fn issue_login_response(&self, user: &User) -> Result<LoginResponse, AuthError> {
        if user.is_deleted() {
            return Err(AuthError::InvalidCredentials);
        }

        let access_token = self.create_access_token(user)?;
        let refresh_token = self.create_refresh_token(user)?;
        let refresh_token_hash = self.token_fingerprint(&refresh_token);

        let refresh_token_entity = RefreshToken {
            id: Uuid::new_v4(),
            user_id: user.id,
            token_hash: refresh_token_hash,
            expires_at: (Utc::now() + Duration::days(self.refresh_token_expiration_days))
                .naive_utc(),
            created_at: Utc::now().naive_utc(),
        };

        self.refresh_token_repo
            .create(&refresh_token_entity)
            .await?;

        let successful_referrals = self.user_repo.count_completed_referrals(user.id).await.unwrap_or(0);

        let user_profile = UserProfile {
            id: user.id,
            email: user.email.clone(),
            name: user.name.clone(),
            role: user.role.clone(),
            email_verified: user.email_verified,
            created_at: user.created_at,
            subscription: self.subscription_info(user.id).await,
            referral_code: user.referral_code.clone(),
            successful_referrals: Some(successful_referrals),
            referral_credits: user.referral_credits,
            is_premium_candidate: user.is_premium_candidate,
        };

        let cached_user = CachedUser {
            id: user.id,
            email: user.email.clone(),
            name: user.name.clone(),
            role: user.role.clone(),
            email_verified: user.email_verified,
            created_at: user.created_at,
            referral_code: user.referral_code.clone(),
            referral_credits: user.referral_credits,
            is_premium_candidate: user.is_premium_candidate,
        };
        self.cache.set_user(&cached_user).await.ok();

        Ok(LoginResponse {
            access_token,
            refresh_token,
            user: user_profile,
            expires_in: self.access_token_expiration_hours * 3600,
        })
    }

    // ===== TOKEN REFRESH =====

    pub async fn refresh_token(
        &self,
        refresh_token: &str,
    ) -> Result<RefreshTokenResponse, AuthError> {
        // Fingerprint the incoming token for lookup (must match what we stored on login)
        let token_hash = self.token_fingerprint(refresh_token);

        // Find and validate refresh token
        let stored_token = self
            .refresh_token_repo
            .find_by_hash(&token_hash)
            .await?
            .ok_or(AuthError::InvalidToken)?;

        // Get user
        let user = self
            .user_repo
            .find_by_id(stored_token.user_id)
            .await?
            .ok_or(AuthError::UserNotFound)?;

        if user.is_deleted() {
            self.refresh_token_repo.delete_by_hash(&token_hash).await?;
            return Err(AuthError::InvalidToken);
        }

        // Delete old refresh token (one-time use)
        self.refresh_token_repo.delete_by_hash(&token_hash).await?;

        // Create new tokens
        let new_access_token = self.create_access_token(&user)?;
        let new_refresh_token = self.create_refresh_token(&user)?;

        // Store new refresh token
        let new_refresh_token_hash = self.token_fingerprint(&new_refresh_token);

        let new_refresh_token_entity = RefreshToken {
            id: Uuid::new_v4(),
            user_id: user.id,
            token_hash: new_refresh_token_hash,
            expires_at: (Utc::now() + Duration::days(self.refresh_token_expiration_days))
                .naive_utc(),
            created_at: Utc::now().naive_utc(),
        };

        self.refresh_token_repo
            .create(&new_refresh_token_entity)
            .await?;

        Ok(RefreshTokenResponse {
            access_token: new_access_token,
            refresh_token: new_refresh_token,
            expires_in: self.access_token_expiration_hours * 3600,
        })
    }

    // ===== LOGOUT =====

    pub async fn logout(
        &self,
        refresh_token: Option<&str>,
        user_id: Uuid,
        access_token: &str,
        access_token_exp: i64,
    ) -> Result<(), AuthError> {
        // Refresh token may be absent (e.g. the web client's cookie already
        // expired/cleared) — access-token revocation and cache cleanup below
        // still happen regardless.
        if let Some(refresh_token) = refresh_token {
            let refresh_token_hash = self.token_fingerprint(refresh_token);

            // Add refresh token to blacklist with expiration (defense-in-depth)
            let expires_at = Utc::now() + Duration::days(self.refresh_token_expiration_days);
            self.blacklist_repo
                .add_to_blacklist(&refresh_token_hash, expires_at.naive_utc())
                .await?;
            self.cache
                .add_to_blacklist(&refresh_token_hash, expires_at.timestamp())
                .await
                .ok();

            // Delete refresh token from database
            self.refresh_token_repo
                .delete_by_hash(&refresh_token_hash)
                .await?;
        }

        // Also blacklist the access token itself, keyed to its own expiry. Without
        // this, logout only revoked the refresh token and a stolen/leaked access
        // token stayed valid on every other route (which check the blacklist via
        // the TokenBlacklistCheck middleware) for up to its full TTL.
        let access_token_hash = self.token_fingerprint(access_token);
        let access_expires_at = chrono::DateTime::<Utc>::from_timestamp(access_token_exp, 0)
            .unwrap_or_else(Utc::now);
        self.blacklist_repo
            .add_to_blacklist(&access_token_hash, access_expires_at.naive_utc())
            .await?;
        self.cache
            .add_to_blacklist(&access_token_hash, access_token_exp)
            .await
            .ok();

        // Clear user cache
        self.cache.invalidate_user(user_id).await.ok();

        Ok(())
    }

    // ===== PASSWORD RESET =====

    pub async fn request_password_reset(
        &self,
        request: RequestPasswordResetRequest,
    ) -> Result<(), AuthError> {
        // Find user by email
        let user = match self.user_repo.find_by_email(&request.email).await? {
            Some(user) if !user.is_deleted() => user,
            _ => return Ok(()), // Don't reveal if email exists for security
        };

        // Generate reset token; only its fingerprint is persisted, matching
        // the email-verification token handling.
        let reset_token = self.generate_secure_token();
        let reset_token_hash = self.token_fingerprint(&reset_token);
        let expires_at = Utc::now() + Duration::hours(1); // 1 hour expiry

        self.user_repo
            .update_password_reset_token(user.id, &reset_token_hash, expires_at)
            .await?;

        // Send password reset email
        if let Err(e) = self
            .email_service
            .send_password_reset_email(&user.email, &reset_token)
            .await
        {
            eprintln!("Failed to send password reset email: {:?}", e);
            // Don't fail the request if email fails, but log it
        }

        Ok(())
    }

    pub async fn reset_password(&self, request: ResetPasswordRequest) -> Result<(), AuthError> {
        if request.new_password.len() < 8 {
            return Err(AuthError::InvalidCredentials);
        }

        let token_hash = self.token_fingerprint(&request.token);
        let user = self
            .user_repo
            .find_by_password_reset_token(&token_hash)
            .await?
            .ok_or(AuthError::InvalidToken)?;

        if user.is_deleted() {
            return Err(AuthError::InvalidToken);
        }

        // Hash new password
        let password_hash = hash(request.new_password, DEFAULT_COST)
            .map_err(|_| AuthError::PasswordHashingError)?;

        self.user_repo
            .update_password(user.id, &password_hash)
            .await?;

        // Invalidate cache
        self.cache.invalidate_user(user.id).await.ok();

        Ok(())
    }

    // ===== PROFILE MANAGEMENT =====

    pub async fn get_profile(&self, user_id: Uuid) -> Result<UserProfile, AuthError> {
        // Try cache first
        if let Some(cached_user) = self.cache.get_user(user_id).await.ok().flatten() {
            let successful_referrals = self.user_repo.count_completed_referrals(user_id).await.unwrap_or(0);
            return Ok(UserProfile {
                id: cached_user.id,
                email: cached_user.email,
                name: cached_user.name,
                role: cached_user.role,
                email_verified: cached_user.email_verified,
                created_at: cached_user.created_at,
                subscription: self.subscription_info(cached_user.id).await,
                referral_code: cached_user.referral_code,
                successful_referrals: Some(successful_referrals),
                referral_credits: cached_user.referral_credits,
                is_premium_candidate: cached_user.is_premium_candidate,
            });
        }

        // Fallback to database
        let user = self
            .user_repo
            .find_by_id(user_id)
            .await?
            .ok_or(AuthError::UserNotFound)?;

        if user.is_deleted() {
            return Err(AuthError::UserNotFound);
        }

        // Cache for future requests
        let cached_user = CachedUser {
            id: user.id,
            email: user.email.clone(),
            name: user.name.clone(),
            role: user.role.clone(),
            email_verified: user.email_verified,
            created_at: user.created_at,
            referral_code: user.referral_code.clone(),
            referral_credits: user.referral_credits,
            is_premium_candidate: user.is_premium_candidate,
        };
        self.cache.set_user(&cached_user).await.ok();

        let successful_referrals = self.user_repo.count_completed_referrals(user_id).await.unwrap_or(0);

        let profile = UserProfile {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            email_verified: user.email_verified,
            created_at: user.created_at,
            subscription: self.subscription_info(user.id).await,
            referral_code: user.referral_code,
            successful_referrals: Some(successful_referrals),
            referral_credits: user.referral_credits,
            is_premium_candidate: user.is_premium_candidate,
        };

        Ok(profile)
    }

    pub async fn update_profile(
        &self,
        user_id: Uuid,
        request: UpdateProfileRequest,
    ) -> Result<(), AuthError> {
        // Changing the email must re-arm verification, otherwise a verified
        // account could claim an arbitrary unverified address for free.
        let mut pending_verification: Option<(String, String)> = None;
        if let Some(ref new_email) = request.email {
            let user = self
                .user_repo
                .find_by_id(user_id)
                .await?
                .ok_or(AuthError::UserNotFound)?;
            if user.email != *new_email {
                let verification_token = self.generate_secure_token();
                let verification_token_hash = self.token_fingerprint(&verification_token);
                let expires_at = (Utc::now() + Duration::hours(24)).naive_utc();
                self.user_repo
                    .update_email_verification_token(user_id, &verification_token_hash, expires_at)
                    .await?;
                pending_verification = Some((new_email.clone(), verification_token));
            }
        }

        self.user_repo
            .update_profile(user_id, request.name.as_deref(), request.email.as_deref())
            .await?;

        if let Some((email, token)) = pending_verification {
            if let Err(e) = self.email_service.send_verification_email(&email, &token, None).await {
                eprintln!("Failed to send verification email after email change: {:?}", e);
            }
        }

        // Invalidate cache
        self.cache.invalidate_user(user_id).await.ok();

        Ok(())
    }

    pub async fn change_password(
        &self,
        user_id: Uuid,
        request: ChangePasswordRequest,
    ) -> Result<(), AuthError> {
        if request.new_password.len() < 8 {
            return Err(AuthError::InvalidCredentials);
        }

        let user = self
            .user_repo
            .find_by_id(user_id)
            .await?
            .ok_or(AuthError::UserNotFound)?;

        if user.is_deleted() {
            return Err(AuthError::UserNotFound);
        }

        let current_hash = user
            .password_hash
            .as_ref()
            .ok_or(AuthError::OAuthOnlyAccount)?;

        if !verify(&request.current_password, current_hash)
            .map_err(|_| AuthError::InvalidCredentials)?
        {
            return Err(AuthError::InvalidCredentials);
        }

        let password_hash = hash(request.new_password, DEFAULT_COST)
            .map_err(|_| AuthError::PasswordHashingError)?;

        self.user_repo
            .update_password(user.id, &password_hash)
            .await?;

        // Invalidate cache
        self.cache.invalidate_user(user.id).await.ok();

        Ok(())
    }

    // ===== ACCOUNT DELETION =====

    pub async fn delete_account(
        &self,
        user_id: Uuid,
        access_token: &str,
        access_token_exp: i64,
    ) -> Result<(), AuthError> {
        self.user_repo.soft_delete_account(user_id).await?;

        self.refresh_token_repo.delete_by_user_id(user_id).await?;

        let access_token_hash = self.token_fingerprint(access_token);
        let access_expires_at = chrono::DateTime::<Utc>::from_timestamp(access_token_exp, 0)
            .unwrap_or_else(Utc::now);
        self.blacklist_repo
            .add_to_blacklist(&access_token_hash, access_expires_at.naive_utc())
            .await?;
        self.cache
            .add_to_blacklist(&access_token_hash, access_token_exp)
            .await
            .ok();
        self.cache.invalidate_user(user_id).await.ok();

        log::info!("Account soft-deleted for user {user_id}");
        Ok(())
    }

    // ===== TOKEN UTILITIES =====

    pub async fn validate_token(&self, token: &str) -> Result<TokenClaims, AuthError> {
        // Check if token is blacklisted
        let token_hash = self.token_fingerprint(token);

        if self.blacklist_repo.is_blacklisted(&token_hash).await?
            || self.cache.is_blacklisted(&token_hash).await?
        {
            return Err(AuthError::TokenBlacklisted);
        }

        // Decode and validate JWT
        let decoding_key = DecodingKey::from_secret(self.jwt_secret.as_ref());
        let validation = Validation::new(Algorithm::HS256);

        let token_data = decode::<TokenClaims>(token, &decoding_key, &validation)
            .map_err(|_| AuthError::InvalidToken)?;

        Ok(token_data.claims)
    }

    pub async fn admin_overview(&self) -> Result<crate::module::auth::model::AdminOverview, AuthError> {
        self.user_repo.admin_overview().await
    }

    pub async fn admin_list_recent_users(
        &self,
        limit: i64,
    ) -> Result<Vec<crate::module::auth::model::AdminUserRow>, AuthError> {
        self.user_repo.admin_list_recent_users(limit).await
    }

    // ===== PRIVATE UTILITIES =====

    fn create_access_token(&self, user: &User) -> Result<String, AuthError> {
        let expiration = Utc::now() + Duration::hours(self.access_token_expiration_hours);

        let claims = TokenClaims {
            sub: user.id.to_string(),
            email: user.email.clone(),
            role: user.role.clone(),
            exp: expiration.timestamp(),
            iat: Utc::now().timestamp(),
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.jwt_secret.as_ref()),
        )
        .map_err(|_| AuthError::TokenCreationError)
    }

    fn create_refresh_token(&self, _user: &User) -> Result<String, AuthError> {
        // Generate a random refresh token (not JWT)
        Ok(self.generate_secure_token())
    }

    fn generate_secure_token(&self) -> String {
        rand::thread_rng()
            .sample_iter(&rand::distributions::Alphanumeric)
            .take(32)
            .map(char::from)
            .collect()
    }

    fn token_fingerprint(&self, token: &str) -> String {
        crate::middleware::auth::token_fingerprint(&self.jwt_secret, token)
    }
}
