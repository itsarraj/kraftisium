use actix_multipart::form::{MultipartFormConfig, tempfile::TempFileConfig};
use actix_web::{App, HttpServer, web};
use std::net::IpAddr;

pub mod configuration;
pub mod matcher_client;
pub mod middleware;
pub mod module;
pub mod routes;
pub mod search;
pub mod storage;
pub mod suggestions;

use dotenvy::dotenv;
use redis::aio::ConnectionManager;
use std::sync::Arc;
pub type DbPool = sqlx::PgPool;
pub type RedisPool = ConnectionManager;

pub async fn run() -> Result<(), Box<dyn std::error::Error>> {
    println!("🔧 Starting BFF...");

    dotenv().ok();
    println!("🔧 Environment variables loaded from .env file");

    let configuration = configuration::get_configuration().expect("Failed to load configuration");
    let database_url = configuration.database.connection_string();
    let redis_url = configuration.redis.connection_string();

    println!(
        "📊 Connecting to database at {}:{}",
        configuration.database.host, configuration.database.port
    );
    println!(
        "🔴 Connecting to redis at {}:{}",
        configuration.redis.host, configuration.redis.port
    );

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(100)
        .min_connections(5)
        .connect(&database_url)
        .await?;

    println!("✅ Database connection established successfully!");

    println!("🔄 Running database migrations...");
    sqlx::migrate!("./migrations").run(&pool).await?;
    println!("✅ Database migrations applied successfully!");

    let redis_client = redis::Client::open(redis_url)?;
    let redis_pool = ConnectionManager::new(redis_client).await?;

    println!("✅ Redis connection established successfully!");

    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    log::info!(
        "Starting BFF server on {}:{}",
        configuration.application_host,
        configuration.application_port
    );

    let server_host = configuration.application_host.trim().to_string();
    let server_port = configuration.application_port;

    let user_repo = module::auth::repository::UserRepository::new(pool.clone());
    let refresh_token_repo = module::auth::repository::RefreshTokenRepository::new(pool.clone());
    let blacklist_repo = module::auth::repository::TokenBlacklistRepository::new(pool.clone());
    let auth_cache = module::auth::cache::AuthCache::new(redis_pool.clone());
    let email_service = module::email::service::EmailService::new(
        configuration.email.api_key.clone(),
        configuration.email.from_email.clone(),
        configuration.email.from_name.clone(),
        configuration.email.base_url.clone(),
        configuration.email.frontend_base_url.clone(),
    );
    let subscription_repo =
        module::subscription::repository::SubscriptionRepository::new(pool.clone());
    let subscription_service = Arc::new(module::subscription::service::SubscriptionService::new(
        subscription_repo,
        user_repo.clone(),
        configuration.subscription.clone(),
        module::email::service::EmailService::new(
            configuration.email.api_key.clone(),
            configuration.email.from_email.clone(),
            configuration.email.from_name.clone(),
            configuration.email.base_url.clone(),
            configuration.email.frontend_base_url.clone(),
        ),
    ));

    let payment_repo = module::payments::repository::PaymentRepository::new(pool.clone());
    let payment_service = Arc::new(module::payments::service::PaymentService::new(
        configuration.razorpay.clone().normalized(),
        Arc::clone(&subscription_service),
        payment_repo,
    ));
    if payment_service.is_configured() {
        log::info!("Razorpay payments enabled");
    } else {
        log::warn!(
            "Razorpay not configured — set BFF__RAZORPAY__KEY_ID and BFF__RAZORPAY__KEY_SECRET to enable checkout"
        );
    }

    let google_oauth = match (
        configuration.oauth.google.client_id.as_ref(),
        configuration.oauth.google.client_secret.as_ref(),
        configuration.oauth.google.redirect_uri.as_ref(),
    ) {
        (Some(client_id), Some(client_secret), Some(redirect_uri))
            if !client_id.is_empty() && !client_secret.is_empty() && !redirect_uri.is_empty() =>
        {
            log::info!("Google OAuth enabled (redirect_uri={redirect_uri})");
            Some(module::auth::google::GoogleOAuthClient::new(
                module::auth::google::GoogleOAuthConfig {
                    client_id: client_id.clone(),
                    client_secret: client_secret.clone(),
                    redirect_uri: redirect_uri.clone(),
                    signing_key: configuration.jwt.secret.clone(),
                },
            ))
        }
        _ => {
            log::warn!("Google OAuth not configured — set BFF__OAUTH__GOOGLE__* env vars to enable");
            None
        }
    };

    // Auth cookies only get `Secure` when we're actually serving over HTTPS —
    // matches the same frontend-URL fallback used for CORS below.
    let cookie_secure = configuration
        .email
        .frontend_base_url
        .clone()
        .unwrap_or_else(|| configuration.email.base_url.clone())
        .starts_with("https://");

    let auth_service = Arc::new(module::auth::service::AuthService::new(
        user_repo,
        refresh_token_repo,
        blacklist_repo,
        auth_cache,
        email_service,
        Some(Arc::clone(&subscription_service)),
        google_oauth,
        configuration.jwt.secret.clone(),
        configuration.jwt.access_token_expiration_hours,
        configuration.jwt.refresh_token_expiration_days,
        cookie_secure,
        configuration.auth.require_email_verification,
        configuration.turnstile.secret_key.clone(),
        configuration.turnstile.hostname_allowlist(),
    ));

    let job_repo = module::resume::repository::JobRepository::new(pool.clone());
    let job_search_index = Arc::new(search::JobSearchIndex::new(pool.clone()));
    let job_service = Arc::new(module::resume::service::JobService::new(
        job_repo.clone(),
        Arc::clone(&job_search_index),
    ));

    let recruiter_repo = module::recruiter::repository::RecruiterRepository::new(pool.clone());
    let recruiter_service = Arc::new(module::recruiter::service::RecruiterService::new(
        recruiter_repo.clone(),
        Arc::clone(&subscription_service),
        configuration.matcher.clone(),
        pool.clone(),
        module::email::service::EmailService::new(
            configuration.email.api_key.clone(),
            configuration.email.from_email.clone(),
            configuration.email.from_name.clone(),
            configuration.email.base_url.clone(),
            configuration.email.frontend_base_url.clone(),
        ),
    ));

    let resume_repo = module::resumes::repository::ResumeRepository::new(pool.clone());
    let object_storage = Arc::new(storage::RustFsStorage::new(
        &configuration.object_storage.endpoint,
        &configuration.object_storage.bucket,
        &configuration.object_storage.access_key_id,
        &configuration.object_storage.secret_access_key,
        &configuration.object_storage.region,
    ));
    if let Err(e) = object_storage.create_bucket_if_not_exists().await {
        log::warn!("RustFS bucket check failed (is RustFS running?): {}", e);
    }
    let resume_service = Arc::new(module::resumes::service::ResumeService::new(
        resume_repo.clone(),
        object_storage,
        module::auth::repository::UserRepository::new(pool.clone()),
    ));

    let application_repo =
        module::applications::repository::ApplicationRepository::new(pool.clone());
    let application_service = Arc::new(module::applications::service::ApplicationService::new(
        application_repo,
        resume_repo.clone(),
        recruiter_repo.clone(),
        job_repo.clone(),
        module::email::service::EmailService::new(
            configuration.email.api_key.clone(),
            configuration.email.from_email.clone(),
            configuration.email.from_name.clone(),
            configuration.email.base_url.clone(),
            configuration.email.frontend_base_url.clone(),
        ),
        pool.clone(),
        configuration.matcher.clone(),
        configuration.subscription.clone(),
    ));

    let profiles_repo = module::profiles::repository::ProfilesRepository::new(pool.clone());
    let profiles_service = Arc::new(module::profiles::service::ProfilesService::new(
        profiles_repo,
    ));

    let saved_jobs_repo = module::saved_jobs::repository::SavedJobsRepository::new(pool.clone());
    let saved_jobs_service = Arc::new(module::saved_jobs::service::SavedJobsService::new(
        saved_jobs_repo,
    ));

    if !configuration.stats.use_hardcoded {
        let pool_stats = pool.clone();
        let interval_secs = configuration.stats.refresh_interval_seconds;
        let initial = (
            configuration.stats.live_jobs,
            configuration.stats.companies,
            configuration.stats.candidates,
            configuration.stats.new_jobs,
        );
        if let Err(e) = module::stats::repository::ensure_stats_row(&pool, initial).await {
            log::warn!("Stats table init failed: {}", e);
        } else if let Err(e) = module::stats::repository::refresh_stats(&pool).await {
            log::warn!("Initial stats refresh failed: {}", e);
        } else {
            log::info!("Initial stats refresh complete");
        }
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(interval_secs));
            interval.tick().await;
            loop {
                interval.tick().await;
                if let Err(e) = module::stats::repository::refresh_stats(&pool_stats).await {
                    log::error!("Stats refresh failed: {}", e);
                } else {
                    log::info!("Stats refreshed (every {}s)", interval_secs);
                }
            }
        });
    }

    {
        // Weekly "new jobs matched your profile" digest — the single biggest
        // candidate retention lever a job board has, per the growth notes.
        // Fixed cadence (not config-driven) to keep this from becoming another
        // knob: 7 days between runs, digesting jobs posted in the last 7 days.
        const DIGEST_INTERVAL: std::time::Duration = std::time::Duration::from_secs(7 * 24 * 3600);
        let job_repo_digest = job_repo.clone();
        let digest_email = module::email::service::EmailService::new(
            configuration.email.api_key.clone(),
            configuration.email.from_email.clone(),
            configuration.email.from_name.clone(),
            configuration.email.base_url.clone(),
            configuration.email.frontend_base_url.clone(),
        );
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(DIGEST_INTERVAL);
            interval.tick().await; // first tick fires immediately; skip it, wait a full cycle
            loop {
                interval.tick().await;
                let since = chrono::Utc::now() - chrono::Duration::days(7);
                match job_repo_digest.find_recent_matches_for_digest(since).await {
                    Ok(rows) => {
                        use std::collections::HashMap;
                        let mut by_user: HashMap<
                            uuid::Uuid,
                            (String, String, Vec<(String, String)>),
                        > = HashMap::new();
                        for row in rows {
                            let entry = by_user
                                .entry(row.user_id)
                                .or_insert_with(|| (row.user_name.clone(), row.user_email.clone(), Vec::new()));
                            if entry.2.len() < 5 {
                                entry.2.push((row.position_title, row.company_name));
                            }
                        }
                        let sent_count = by_user.len();
                        for (name, email, matches) in by_user.into_values() {
                            if let Err(e) =
                                digest_email.send_job_digest_email(&email, &name, &matches).await
                            {
                                log::warn!("Job digest email failed for {}: {}", email, e);
                            }
                        }
                        log::info!("Job digest sent to {} candidates", sent_count);
                    }
                    Err(e) => log::error!("Job digest query failed: {}", e),
                }
            }
        });
    }

    let temp_dir = std::env::temp_dir();

    let cors_frontend_url = configuration
        .email
        .frontend_base_url
        .clone()
        .unwrap_or_else(|| configuration.email.base_url.clone());

    let server = HttpServer::new(move || {
        App::new()
            .wrap(middleware::blacklist::TokenBlacklistCheck::new(
                redis_pool.clone(),
                configuration.jwt.secret.clone(),
            ))
            .wrap(middleware::cors::configure_cors(cors_frontend_url.clone()))
            .app_data(TempFileConfig::default().directory(temp_dir.clone()))
            .app_data(MultipartFormConfig::default().total_limit(5 * 1024 * 1024))
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(redis_pool.clone()))
            .app_data(web::Data::new(configuration.clone()))
            .app_data(web::Data::new(Arc::clone(&auth_service)))
            .app_data(web::Data::new(Arc::clone(&job_service)))
            .app_data(web::Data::new(Arc::clone(&job_search_index)))
            .app_data(web::Data::new(Arc::clone(&recruiter_service)))
            .app_data(web::Data::new(Arc::clone(&resume_service)))
            .app_data(web::Data::new(Arc::clone(&application_service)))
            .app_data(web::Data::new(Arc::clone(&profiles_service)))
            .app_data(web::Data::new(Arc::clone(&saved_jobs_service)))
            .app_data(web::Data::new(Arc::clone(&subscription_service)))
            .app_data(web::Data::new(Arc::clone(&payment_service)))
            .configure(routes::config)
    });

    let server = match server_host.parse::<IpAddr>() {
        Ok(ip) => server.bind((ip, server_port))?,
        Err(_) => server.bind((server_host.as_str(), server_port))?,
    };

    server.run().await?;
    println!("BFF server stopped");
    Ok(())
}
