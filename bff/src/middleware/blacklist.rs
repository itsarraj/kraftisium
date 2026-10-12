use crate::middleware::auth::token_fingerprint;
use actix_web::body::EitherBody;
use actix_web::dev::{Service, ServiceRequest, ServiceResponse, Transform, forward_ready};
use actix_web::{Error, HttpResponse};
use redis::aio::ConnectionManager;
use std::future::{Ready, ready};
use std::rc::Rc;

/// App-wide guard that rejects any request carrying a blacklisted bearer token
/// before it reaches a handler. `extract_auth_user` (used by nearly every route)
/// only checks JWT signature/expiry, not revocation, so without this, logging
/// out never actually ended a session — the access token kept working on every
/// route except the auth module's own handlers until it expired on its own.
pub struct TokenBlacklistCheck {
    redis: ConnectionManager,
    jwt_secret: Rc<String>,
}

impl TokenBlacklistCheck {
    pub fn new(redis: ConnectionManager, jwt_secret: String) -> Self {
        Self {
            redis,
            jwt_secret: Rc::new(jwt_secret),
        }
    }
}

impl<S, B> Transform<S, ServiceRequest> for TokenBlacklistCheck
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Transform = TokenBlacklistCheckMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(TokenBlacklistCheckMiddleware {
            service: Rc::new(service),
            redis: self.redis.clone(),
            jwt_secret: self.jwt_secret.clone(),
        }))
    }
}

pub struct TokenBlacklistCheckMiddleware<S> {
    service: Rc<S>,
    redis: ConnectionManager,
    jwt_secret: Rc<String>,
}

impl<S, B> Service<ServiceRequest> for TokenBlacklistCheckMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Future = std::pin::Pin<Box<dyn std::future::Future<Output = Result<Self::Response, Self::Error>>>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let token = crate::middleware::auth::extract_access_token(req.request());

        let service = Rc::clone(&self.service);
        let mut redis = self.redis.clone();
        let jwt_secret = Rc::clone(&self.jwt_secret);

        Box::pin(async move {
            if let Some(token) = token {
                let hash = token_fingerprint(&jwt_secret, &token);
                let key = format!("blacklist:{}", hash);
                let blacklisted: Option<String> = redis::cmd("GET")
                    .arg(&key)
                    .query_async(&mut redis)
                    .await
                    .unwrap_or(None);

                if blacklisted.is_some() {
                    let response = HttpResponse::Unauthorized()
                        .json(serde_json::json!({
                            "error": "Unauthorized",
                            "message": "Token has been revoked"
                        }))
                        .map_into_right_body();
                    return Ok(req.into_response(response));
                }
            }

            service.call(req).await.map(|res| res.map_into_left_body())
        })
    }
}
