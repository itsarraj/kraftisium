use crate::middleware::auth as auth_mw;
use crate::module::auth::{model::*, service::AuthService};
use actix_web::{HttpRequest, HttpResponse, Responder, web};
use std::sync::Arc;

/// True for the web flow (`http(s)://...` redirect target). False means a
/// native deep link (e.g. `kraftisium://...`), which is how the mobile app
/// asks for this same callback — it has no cookie jar shared with the BFF,
/// so it still needs tokens embedded in the redirect like before.
fn is_web_redirect(redirect_to: &str) -> bool {
    redirect_to.starts_with("http://") || redirect_to.starts_with("https://")
}

fn build_oauth_redirect(redirect_to: &str, login: &LoginResponse, embed_tokens: bool) -> String {
    if !embed_tokens {
        // Web: cookies were already set on this response; nothing sensitive
        // goes in the URL, which is what made the old flow forgeable (an
        // attacker could hand a victim a link with the attacker's own tokens
        // baked into the fragment and log them into the attacker's account).
        return format!("{redirect_to}?auth=success");
    }

    let user_json = serde_json::to_string(&login.user).unwrap_or_default();
    let encoded_user = urlencoding::encode(&user_json);
    format!(
        "{redirect_to}?access_token={}&refresh_token={}&expires_in={}&user={encoded_user}",
        urlencoding::encode(&login.access_token),
        urlencoding::encode(&login.refresh_token),
        login.expires_in,
    )
}

fn oauth_error_redirect(redirect_to: &str, message: &str) -> String {
    let use_fragment = redirect_to.starts_with("http://") || redirect_to.starts_with("https://");
    let encoded = urlencoding::encode(message);
    if use_fragment {
        format!("{redirect_to}#error={encoded}")
    } else {
        format!("{redirect_to}?error={encoded}")
    }
}

/// Attaches the httpOnly auth cookies to a response builder. The JSON body
/// still carries the tokens too (unchanged) — the mobile app reads them from
/// there and ignores the cookies; the web client does the opposite.
fn set_auth_cookies(
    builder: &mut actix_web::HttpResponseBuilder,
    auth_service: &AuthService,
    access_token: &str,
    refresh_token: &str,
    expires_in: i64,
) {
    let secure = auth_service.cookie_secure();
    builder.cookie(auth_mw::access_token_cookie(
        access_token.to_string(),
        expires_in,
        secure,
    ));
    builder.cookie(auth_mw::refresh_token_cookie(
        refresh_token.to_string(),
        auth_service.refresh_token_expiration_days() * 86400,
        secure,
    ));
}

// ===== AUTH ENDPOINTS =====

fn client_ip(req: &HttpRequest) -> Option<String> {
    req.connection_info()
        .realip_remote_addr()
        .map(str::to_string)
}

// POST /api/v1/auth/register
pub async fn register(
    req: HttpRequest,
    auth_service: web::Data<Arc<AuthService>>,
    request: web::Json<RegisterRequest>,
) -> impl Responder {
    let remote_ip = client_ip(&req);
    match auth_service
        .register(request.into_inner(), remote_ip.as_deref())
        .await
    {
        Ok(response) => HttpResponse::Created().json(response),
        Err(AuthError::UserAlreadyExists) => HttpResponse::Conflict().json(ErrorResponse {
            error: "UserAlreadyExists".to_string(),
            message: Some("A user with this email already exists".to_string()),
        }),
        Err(AuthError::InvalidCredentials) => HttpResponse::BadRequest().json(ErrorResponse {
            error: "WeakPassword".to_string(),
            message: Some("Password must be at least 8 characters long".to_string()),
        }),
        Err(AuthError::TermsNotAccepted) => HttpResponse::BadRequest().json(ErrorResponse {
            error: "TermsNotAccepted".to_string(),
            message: Some("You must accept the Terms of Service to register".to_string()),
        }),
        Err(AuthError::TurnstileFailed) => HttpResponse::BadRequest().json(ErrorResponse {
            error: "TurnstileFailed".to_string(),
            message: Some("CAPTCHA verification failed. Please try again.".to_string()),
        }),
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "RegistrationFailed".to_string(),
            message: Some("Failed to register user".to_string()),
        }),
    }
}

// POST /api/v1/auth/login
pub async fn login(
    req: HttpRequest,
    auth_service: web::Data<Arc<AuthService>>,
    request: web::Json<LoginRequest>,
) -> impl Responder {
    let remote_ip = client_ip(&req);
    match auth_service
        .login(request.into_inner(), remote_ip.as_deref())
        .await
    {
        Ok(response) => {
            let mut resp = HttpResponse::Ok();
            set_auth_cookies(
                &mut resp,
                &auth_service,
                &response.access_token,
                &response.refresh_token,
                response.expires_in,
            );
            resp.json(response)
        }
        Err(AuthError::InvalidCredentials) => HttpResponse::Unauthorized().json(ErrorResponse {
            error: "InvalidCredentials".to_string(),
            message: Some("Invalid email or password".to_string()),
        }),
        Err(AuthError::TooManyLoginAttempts) => {
            HttpResponse::TooManyRequests().json(ErrorResponse {
                error: "TooManyLoginAttempts".to_string(),
                message: Some("Too many failed login attempts. Try again later".to_string()),
            })
        }
        Err(AuthError::EmailNotVerified) => HttpResponse::Forbidden().json(ErrorResponse {
            error: "EmailNotVerified".to_string(),
            message: Some("Please verify your email before logging in".to_string()),
        }),
        Err(AuthError::TurnstileFailed) => HttpResponse::BadRequest().json(ErrorResponse {
            error: "TurnstileFailed".to_string(),
            message: Some("CAPTCHA verification failed. Please try again.".to_string()),
        }),
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "LoginFailed".to_string(),
            message: Some("Failed to authenticate user".to_string()),
        }),
    }
}

// POST /api/v1/auth/refresh
pub async fn refresh_token(
    auth_service: web::Data<Arc<AuthService>>,
    req: HttpRequest,
    request: web::Json<RefreshTokenRequest>,
) -> impl Responder {
    let Some(token) =
        auth_mw::extract_refresh_token(&req, request.into_inner().refresh_token.as_deref())
    else {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "MissingRefreshToken".to_string(),
            message: Some("Refresh token is required".to_string()),
        });
    };

    match auth_service.refresh_token(&token).await {
        Ok(response) => {
            let mut resp = HttpResponse::Ok();
            set_auth_cookies(
                &mut resp,
                &auth_service,
                &response.access_token,
                &response.refresh_token,
                response.expires_in,
            );
            resp.json(response)
        }
        Err(AuthError::InvalidToken) => HttpResponse::Unauthorized().json(ErrorResponse {
            error: "InvalidRefreshToken".to_string(),
            message: Some("Invalid or expired refresh token".to_string()),
        }),
        Err(AuthError::UserNotFound) => HttpResponse::Unauthorized().json(ErrorResponse {
            error: "UserNotFound".to_string(),
            message: Some("User associated with token not found".to_string()),
        }),
        Err(e) => {
            eprintln!("Token refresh failed: {:?}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: "TokenRefreshFailed".to_string(),
                message: Some("Failed to refresh token".to_string()),
            })
        }
    }
}

// GET /api/v1/auth/google — start Google OAuth (BFF redirects to Google)
pub async fn google_auth_start(
    auth_service: web::Data<Arc<AuthService>>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let redirect_to = match query.get("redirect_to") {
        Some(v) if !v.trim().is_empty() => v.clone(),
        _ => {
            return HttpResponse::BadRequest().json(ErrorResponse {
                error: "MissingRedirectTo".to_string(),
                message: Some("redirect_to query parameter is required".to_string()),
            });
        }
    };

    let role = query.get("role").map(|s| s.as_str()).unwrap_or("user");

    match auth_service.google_authorization_url(&redirect_to, role) {
        Ok(url) => HttpResponse::Found()
            .append_header(("Location", url))
            .finish(),
        Err(AuthError::OAuthNotConfigured) => HttpResponse::ServiceUnavailable().json(ErrorResponse {
            error: "OAuthNotConfigured".to_string(),
            message: Some("Google sign-in is not configured on this server".to_string()),
        }),
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "GoogleAuthStartFailed".to_string(),
            message: Some("Failed to start Google sign-in".to_string()),
        }),
    }
}

// GET /api/v1/auth/google/callback — Google redirects here; BFF issues JWT and redirects client
pub async fn google_auth_callback(
    auth_service: web::Data<Arc<AuthService>>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    if let Some(error) = query.get("error") {
        let description = query
            .get("error_description")
            .map(|s| s.as_str())
            .unwrap_or(error);
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "GoogleAuthDenied".to_string(),
            message: Some(description.to_string()),
        });
    }

    let code = match query.get("code") {
        Some(v) if !v.trim().is_empty() => v.clone(),
        _ => {
            return HttpResponse::BadRequest().json(ErrorResponse {
                error: "MissingAuthCode".to_string(),
                message: Some("Authorization code is missing".to_string()),
            });
        }
    };

    let state = match query.get("state") {
        Some(v) if !v.trim().is_empty() => v.clone(),
        _ => {
            return HttpResponse::BadRequest().json(ErrorResponse {
                error: "MissingOAuthState".to_string(),
                message: Some("OAuth state is missing".to_string()),
            });
        }
    };

    match auth_service.google_oauth_callback(&code, &state).await {
        Ok((login, redirect_to)) => {
            let web_flow = is_web_redirect(&redirect_to);
            let location = build_oauth_redirect(&redirect_to, &login, !web_flow);
            let mut resp = HttpResponse::Found();
            if web_flow {
                set_auth_cookies(
                    &mut resp,
                    &auth_service,
                    &login.access_token,
                    &login.refresh_token,
                    login.expires_in,
                );
            }
            resp.append_header(("Location", location)).finish()
        }
        Err(AuthError::OAuthNotConfigured) => HttpResponse::ServiceUnavailable().json(ErrorResponse {
            error: "OAuthNotConfigured".to_string(),
            message: Some("Google sign-in is not configured on this server".to_string()),
        }),
        Err(AuthError::GoogleAuthFailed) => {
            if let Ok((redirect_to, _)) = auth_service.decode_google_oauth_state(&state) {
                HttpResponse::Found()
                    .append_header((
                        "Location",
                        oauth_error_redirect(&redirect_to, "Google sign-in failed"),
                    ))
                    .finish()
            } else {
                HttpResponse::BadRequest().json(ErrorResponse {
                    error: "GoogleAuthFailed".to_string(),
                    message: Some("Google sign-in failed".to_string()),
                })
            }
        }
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "GoogleAuthCallbackFailed".to_string(),
            message: Some("Failed to complete Google sign-in".to_string()),
        }),
    }
}

// POST /api/v1/auth/google — verify Google ID token and issue JWT (mobile / programmatic)
pub async fn google_auth_token(
    auth_service: web::Data<Arc<AuthService>>,
    request: web::Json<GoogleLoginRequest>,
) -> impl Responder {
    match auth_service.google_login_with_id_token(request.into_inner()).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(AuthError::OAuthNotConfigured) => HttpResponse::ServiceUnavailable().json(ErrorResponse {
            error: "OAuthNotConfigured".to_string(),
            message: Some("Google sign-in is not configured on this server".to_string()),
        }),
        Err(AuthError::GoogleAuthFailed) => HttpResponse::Unauthorized().json(ErrorResponse {
            error: "GoogleAuthFailed".to_string(),
            message: Some("Invalid or expired Google token".to_string()),
        }),
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "GoogleLoginFailed".to_string(),
            message: Some("Failed to sign in with Google".to_string()),
        }),
    }
}

// POST /api/v1/auth/logout
pub async fn logout(
    auth_service: web::Data<Arc<AuthService>>,
    req: HttpRequest,
    request: web::Json<LogoutRequest>,
) -> impl Responder {
    // Bearer header (mobile) or the httpOnly access-token cookie (web).
    let Some(token) = auth_mw::extract_access_token(&req) else {
        return HttpResponse::Unauthorized().json(ErrorResponse {
            error: "MissingAuthorizationHeader".to_string(),
            message: Some("Authorization header or auth cookie is required".to_string()),
        });
    };

    // Validate token and extract user ID
    let claims = match auth_service.validate_token(&token).await {
        Ok(claims) => claims,
        Err(AuthError::TokenExpired) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "TokenExpired".to_string(),
                message: Some("Access token has expired".to_string()),
            });
        }
        Err(AuthError::TokenBlacklisted) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "TokenRevoked".to_string(),
                message: Some("Token has been revoked".to_string()),
            });
        }
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "InvalidToken".to_string(),
                message: Some("Invalid or malformed access token".to_string()),
            });
        }
    };

    let user_id = match uuid::Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "InvalidTokenClaims".to_string(),
                message: Some("Invalid user ID in token".to_string()),
            });
        }
    };

    let refresh_token =
        auth_mw::extract_refresh_token(&req, request.into_inner().refresh_token.as_deref());

    match auth_service
        .logout(refresh_token.as_deref(), user_id, &token, claims.exp)
        .await
    {
        Ok(_) => {
            let mut resp = HttpResponse::Ok();
            for cookie in auth_mw::clear_auth_cookies(auth_service.cookie_secure()) {
                resp.cookie(cookie);
            }
            resp.json(serde_json::json!({
                "message": "Successfully logged out"
            }))
        }
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "LogoutFailed".to_string(),
            message: Some("Failed to logout".to_string()),
        }),
    }
}

// GET /api/v1/auth/verify-email/{token}
pub async fn verify_email(
    auth_service: web::Data<Arc<AuthService>>,
    path: web::Path<String>,
) -> impl Responder {
    let token = path.into_inner();

    match auth_service.verify_email(&token).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Email verified successfully"
        })),
        Err(AuthError::InvalidVerificationToken) => {
            HttpResponse::BadRequest().json(ErrorResponse {
                error: "InvalidVerificationToken".to_string(),
                message: Some("Invalid or expired verification token".to_string()),
            })
        }
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "VerificationFailed".to_string(),
            message: Some("Failed to verify email".to_string()),
        }),
    }
}

// POST /api/v1/auth/verify-email
pub async fn verify_email_from_request(
    auth_service: web::Data<Arc<AuthService>>,
    request: web::Json<VerifyEmailRequest>,
) -> impl Responder {
    match auth_service.verify_email(&request.token).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Email verified successfully"
        })),
        Err(AuthError::InvalidVerificationToken) => {
            HttpResponse::BadRequest().json(ErrorResponse {
                error: "InvalidVerificationToken".to_string(),
                message: Some("Invalid or expired verification token".to_string()),
            })
        }
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "VerificationFailed".to_string(),
            message: Some("Failed to verify email".to_string()),
        }),
    }
}

// POST /api/v1/auth/password-reset
pub async fn request_password_reset(
    auth_service: web::Data<Arc<AuthService>>,
    request: web::Json<RequestPasswordResetRequest>,
) -> impl Responder {
    match auth_service
        .request_password_reset(request.into_inner())
        .await
    {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "If the email exists, a password reset link has been sent"
        })),
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "PasswordResetFailed".to_string(),
            message: Some("Failed to request password reset".to_string()),
        }),
    }
}

// POST /api/v1/auth/password-reset/confirm
pub async fn reset_password(
    auth_service: web::Data<Arc<AuthService>>,
    request: web::Json<ResetPasswordRequest>,
) -> impl Responder {
    match auth_service.reset_password(request.into_inner()).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Password reset successfully"
        })),
        Err(AuthError::InvalidToken) => HttpResponse::BadRequest().json(ErrorResponse {
            error: "InvalidResetToken".to_string(),
            message: Some("Invalid or expired reset token".to_string()),
        }),
        Err(AuthError::InvalidCredentials) => HttpResponse::BadRequest().json(ErrorResponse {
            error: "WeakPassword".to_string(),
            message: Some("Password must be at least 8 characters long".to_string()),
        }),
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "PasswordResetFailed".to_string(),
            message: Some("Failed to reset password".to_string()),
        }),
    }
}

// ===== USER ENDPOINTS =====

// GET /api/v1/user/profile
pub async fn get_profile(
    auth_service: web::Data<Arc<AuthService>>,
    req: HttpRequest,
) -> impl Responder {
    // Bearer header (mobile) or the httpOnly access-token cookie (web).
    let Some(token) = auth_mw::extract_access_token(&req) else {
        return HttpResponse::Unauthorized().json(ErrorResponse {
            error: "MissingAuthorizationHeader".to_string(),
            message: Some("Authorization header or auth cookie is required".to_string()),
        });
    };

    // Validate token and extract user ID
    let claims = match auth_service.validate_token(&token).await {
        Ok(claims) => claims,
        Err(AuthError::TokenExpired) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "TokenExpired".to_string(),
                message: Some("Access token has expired".to_string()),
            });
        }
        Err(AuthError::TokenBlacklisted) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "TokenRevoked".to_string(),
                message: Some("Token has been revoked".to_string()),
            });
        }
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "InvalidToken".to_string(),
                message: Some("Invalid or malformed access token".to_string()),
            });
        }
    };

    let user_id = match uuid::Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "InvalidTokenClaims".to_string(),
                message: Some("Invalid user ID in token".to_string()),
            });
        }
    };

    match auth_service.get_profile(user_id).await {
        Ok(profile) => HttpResponse::Ok().json(profile),
        Err(AuthError::UserNotFound) => HttpResponse::NotFound().json(ErrorResponse {
            error: "UserNotFound".to_string(),
            message: Some("User profile not found".to_string()),
        }),
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "ProfileFetchFailed".to_string(),
            message: Some("Failed to fetch user profile".to_string()),
        }),
    }
}

// PUT /api/v1/user/profile
pub async fn update_profile(
    auth_service: web::Data<Arc<AuthService>>,
    req: HttpRequest,
    request: web::Json<UpdateProfileRequest>,
) -> impl Responder {
    // Bearer header (mobile) or the httpOnly access-token cookie (web).
    let Some(token) = auth_mw::extract_access_token(&req) else {
        return HttpResponse::Unauthorized().json(ErrorResponse {
            error: "MissingAuthorizationHeader".to_string(),
            message: Some("Authorization header or auth cookie is required".to_string()),
        });
    };

    // Validate token and extract user ID
    let claims = match auth_service.validate_token(&token).await {
        Ok(claims) => claims,
        Err(AuthError::TokenExpired) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "TokenExpired".to_string(),
                message: Some("Access token has expired".to_string()),
            });
        }
        Err(AuthError::TokenBlacklisted) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "TokenRevoked".to_string(),
                message: Some("Token has been revoked".to_string()),
            });
        }
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "InvalidToken".to_string(),
                message: Some("Invalid or malformed access token".to_string()),
            });
        }
    };

    let user_id = match uuid::Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "InvalidTokenClaims".to_string(),
                message: Some("Invalid user ID in token".to_string()),
            });
        }
    };

    match auth_service
        .update_profile(user_id, request.into_inner())
        .await
    {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Profile updated successfully"
        })),
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "ProfileUpdateFailed".to_string(),
            message: Some("Failed to update profile".to_string()),
        }),
    }
}

// POST /api/v1/user/change-password
pub async fn change_password(
    auth_service: web::Data<Arc<AuthService>>,
    req: HttpRequest,
    request: web::Json<ChangePasswordRequest>,
) -> impl Responder {
    // Bearer header (mobile) or the httpOnly access-token cookie (web).
    let Some(token) = auth_mw::extract_access_token(&req) else {
        return HttpResponse::Unauthorized().json(ErrorResponse {
            error: "MissingAuthorizationHeader".to_string(),
            message: Some("Authorization header or auth cookie is required".to_string()),
        });
    };

    // Validate token and extract user ID
    let claims = match auth_service.validate_token(&token).await {
        Ok(claims) => claims,
        Err(AuthError::TokenExpired) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "TokenExpired".to_string(),
                message: Some("Access token has expired".to_string()),
            });
        }
        Err(AuthError::TokenBlacklisted) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "TokenRevoked".to_string(),
                message: Some("Token has been revoked".to_string()),
            });
        }
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "InvalidToken".to_string(),
                message: Some("Invalid or malformed access token".to_string()),
            });
        }
    };

    let user_id = match uuid::Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "InvalidTokenClaims".to_string(),
                message: Some("Invalid user ID in token".to_string()),
            });
        }
    };

    match auth_service
        .change_password(user_id, request.into_inner())
        .await
    {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Password changed successfully"
        })),
        Err(AuthError::InvalidCredentials) => HttpResponse::BadRequest().json(ErrorResponse {
            error: "InvalidCurrentPassword".to_string(),
            message: Some("Current password is incorrect".to_string()),
        }),
        Err(AuthError::OAuthOnlyAccount) => HttpResponse::BadRequest().json(ErrorResponse {
            error: "OAuthOnlyAccount".to_string(),
            message: Some(
                "This account uses Google sign-in. Set a password via password reset if needed."
                    .to_string(),
            ),
        }),
        Err(AuthError::UserNotFound) => HttpResponse::NotFound().json(ErrorResponse {
            error: "UserNotFound".to_string(),
            message: Some("User not found".to_string()),
        }),
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "PasswordChangeFailed".to_string(),
            message: Some("Failed to change password".to_string()),
        }),
    }
}

// DELETE /api/v1/user/account
pub async fn delete_account(
    auth_service: web::Data<Arc<AuthService>>,
    req: HttpRequest,
) -> impl Responder {
    let Some(token) = auth_mw::extract_access_token(&req) else {
        return HttpResponse::Unauthorized().json(ErrorResponse {
            error: "MissingAuthorizationHeader".to_string(),
            message: Some("Authorization header or auth cookie is required".to_string()),
        });
    };

    let claims = match auth_service.validate_token(&token).await {
        Ok(claims) => claims,
        Err(AuthError::TokenExpired) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "TokenExpired".to_string(),
                message: Some("Access token has expired".to_string()),
            });
        }
        Err(AuthError::TokenBlacklisted) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "TokenRevoked".to_string(),
                message: Some("Token has been revoked".to_string()),
            });
        }
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "InvalidToken".to_string(),
                message: Some("Invalid or malformed access token".to_string()),
            });
        }
    };

    let user_id = match uuid::Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "InvalidTokenClaims".to_string(),
                message: Some("Invalid user ID in token".to_string()),
            });
        }
    };

    match auth_service
        .delete_account(user_id, &token, claims.exp)
        .await
    {
        Ok(_) => {
            let mut resp = HttpResponse::Ok();
            for cookie in auth_mw::clear_auth_cookies(auth_service.cookie_secure()) {
                resp.cookie(cookie);
            }
            resp.json(serde_json::json!({
                "message": "Account deleted. Thank you."
            }))
        }
        Err(AuthError::UserNotFound) => HttpResponse::NotFound().json(ErrorResponse {
            error: "UserNotFound".to_string(),
            message: Some("User not found".to_string()),
        }),
        Err(AuthError::AccountAlreadyDeleted) => HttpResponse::BadRequest().json(ErrorResponse {
            error: "AccountAlreadyDeleted".to_string(),
            message: Some("This account has already been deleted".to_string()),
        }),
        Err(e) => {
            log::error!("Account deletion failed for {user_id}: {e}");
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: "AccountDeletionFailed".to_string(),
                message: Some("Failed to delete account".to_string()),
            })
        }
    }
}

// ===== ADMIN ENDPOINTS =====

// GET /api/v1/admin/users
pub async fn admin_get_users(
    auth_service: web::Data<Arc<AuthService>>,
    req: HttpRequest,
) -> impl Responder {
    // Bearer header (mobile) or the httpOnly access-token cookie (web).
    let Some(token) = auth_mw::extract_access_token(&req) else {
        return HttpResponse::Unauthorized().json(ErrorResponse {
            error: "MissingAuthorizationHeader".to_string(),
            message: Some("Authorization header or auth cookie is required".to_string()),
        });
    };

    // Validate token and check admin role
    let claims = match auth_service.validate_token(&token).await {
        Ok(claims) => claims,
        Err(AuthError::TokenExpired) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "TokenExpired".to_string(),
                message: Some("Access token has expired".to_string()),
            });
        }
        Err(AuthError::TokenBlacklisted) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "TokenRevoked".to_string(),
                message: Some("Token has been revoked".to_string()),
            });
        }
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "InvalidToken".to_string(),
                message: Some("Invalid or malformed access token".to_string()),
            });
        }
    };

    // Check if user has admin role
    if claims.role != "admin" {
        return HttpResponse::Forbidden().json(ErrorResponse {
            error: "InsufficientPermissions".to_string(),
            message: Some("Admin role required for this endpoint".to_string()),
        });
    }

    match auth_service.admin_list_recent_users(200).await {
        Ok(users) => HttpResponse::Ok().json(users),
        Err(e) => {
            log::error!("admin_list_recent_users failed: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

// GET /api/v1/admin/overview
pub async fn admin_get_overview(
    auth_service: web::Data<Arc<AuthService>>,
    req: HttpRequest,
) -> impl Responder {
    let Some(token) = auth_mw::extract_access_token(&req) else {
        return HttpResponse::Unauthorized().json(ErrorResponse {
            error: "MissingAuthorizationHeader".to_string(),
            message: Some("Authorization header or auth cookie is required".to_string()),
        });
    };

    let claims = match auth_service.validate_token(&token).await {
        Ok(claims) => claims,
        Err(AuthError::TokenExpired) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "TokenExpired".to_string(),
                message: Some("Access token has expired".to_string()),
            });
        }
        Err(AuthError::TokenBlacklisted) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "TokenRevoked".to_string(),
                message: Some("Token has been revoked".to_string()),
            });
        }
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                error: "InvalidToken".to_string(),
                message: Some("Invalid or malformed access token".to_string()),
            });
        }
    };

    if claims.role != "admin" {
        return HttpResponse::Forbidden().json(ErrorResponse {
            error: "InsufficientPermissions".to_string(),
            message: Some("Admin role required for this endpoint".to_string()),
        });
    }

    match auth_service.admin_overview().await {
        Ok(overview) => HttpResponse::Ok().json(overview),
        Err(e) => {
            log::error!("admin_overview failed: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}
