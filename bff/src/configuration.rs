#[derive(serde::Deserialize, Clone)]
pub struct Settings {
    pub database: DatabaseSettings,
    pub redis: RedisSettings,
    pub jwt: JwtSettings,
    pub email: EmailSettings,
    pub stats: StatsSettings,
    #[serde(default)]
    pub matcher: MatcherSettings,
    #[serde(default)]
    pub subscription: SubscriptionSettings,
    pub object_storage: ObjectStorageSettings,
    #[serde(default)]
    pub oauth: OAuthSettings,
    #[serde(default)]
    pub razorpay: RazorpaySettings,
    pub application_host: String,
    pub application_port: u16,
    #[serde(default)]
    pub auth: AuthSettings,
    #[serde(default)]
    pub turnstile: TurnstileSettings,
}

/// Cloudflare Turnstile CAPTCHA on register/login. Off (`secret_key: None`)
/// unless explicitly configured, so local dev and any client that can't
/// present a token (the mobile app has no Turnstile widget) aren't broken by
/// default — see `docs/turnstile.md` for the mobile-compatibility tradeoff
/// before enabling this in an environment the app also serves.
#[derive(serde::Deserialize, Clone, Default)]
pub struct TurnstileSettings {
    pub secret_key: Option<String>,
    /// Comma-separated frontend hostnames siteverify must echo (no scheme, no port).
    /// Required whenever `secret_key` is set; an empty list fails closed.
    /// Local: `localhost,127.0.0.1`. Production must not include localhost.
    #[serde(default)]
    pub hostnames: Option<String>,
}

impl TurnstileSettings {
    pub fn hostname_allowlist(&self) -> Vec<String> {
        self.hostnames
            .as_deref()
            .unwrap_or("")
            .split(',')
            .map(|host| host.trim().to_ascii_lowercase())
            .filter(|host| !host.is_empty())
            .collect()
    }
}

#[derive(serde::Deserialize, Clone, Default)]
pub struct AuthSettings {
    #[serde(default = "default_require_email_verification")]
    pub require_email_verification: bool,
}

fn default_require_email_verification() -> bool {
    true
}

#[derive(serde::Deserialize, Clone, Default)]
pub struct OAuthSettings {
    #[serde(default)]
    pub google: GoogleOAuthSettings,
}

#[derive(serde::Deserialize, Clone, Default)]
pub struct RazorpaySettings {
    pub key_id: Option<String>,
    pub key_secret: Option<String>,
    /// Razorpay Dashboard → Webhooks → secret (falls back to key_secret if unset).
    pub webhook_secret: Option<String>,
    #[serde(default = "default_razorpay_currency")]
    pub currency: String,
    /// Yearly Premium charge in minor units (USD cents). Default: 19900 (= $199).
    #[serde(default = "default_razorpay_yearly_amount_paise")]
    pub yearly_amount_paise: u64,
}

fn default_razorpay_currency() -> String {
    "USD".to_string()
}

fn default_razorpay_yearly_amount_paise() -> u64 {
    19_900
}

impl RazorpaySettings {
    pub fn normalized(mut self) -> Self {
        self.key_id = self
            .key_id
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        self.key_secret = self
            .key_secret
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        self.webhook_secret = self
            .webhook_secret
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        self.currency = self.currency.trim().to_string();
        self
    }

    pub fn is_configured(&self) -> bool {
        self.key_id
            .as_ref()
            .is_some_and(|id| !id.is_empty())
            && self
                .key_secret
                .as_ref()
                .is_some_and(|secret| !secret.is_empty())
    }
}

#[derive(serde::Deserialize, Clone, Default)]
pub struct GoogleOAuthSettings {
    pub client_id: Option<String>,
    pub client_secret: Option<String>,
    /// BFF callback URL registered in Google Cloud Console, e.g. http://localhost:8000/api/v1/auth/google/callback
    pub redirect_uri: Option<String>,
}

#[derive(serde::Deserialize, Clone, Default)]
pub struct MatcherSettings {
    pub base_url: Option<String>,
    pub internal_secret: Option<String>,
}

/// Yearly Premium / founding offer. Change limits here and redeploy.
#[derive(serde::Deserialize, Clone)]
pub struct SubscriptionSettings {
    /// How many signups receive free 1-year Premium (founding offer).
    #[serde(default = "default_founding_premium_limit")]
    pub founding_premium_limit: u32,
    #[serde(default = "default_founding_premium_years")]
    pub founding_premium_years: i64,
    #[serde(default = "default_yearly_price_usd")]
    pub yearly_price_usd: u32,
    #[serde(default = "default_free_ai_matches_limit")]
    pub free_ai_matches_limit: u32,
    /// Max active job posts per company for non-premium recruiters.
    #[serde(default = "default_free_active_jobs_limit")]
    pub free_active_jobs_limit: u32,
    /// Suggested-candidate results per job (free vs premium recruiters).
    #[serde(default = "default_free_suggested_candidates_limit")]
    pub free_suggested_candidates_limit: u32,
    #[serde(default = "default_premium_suggested_candidates_limit")]
    pub premium_suggested_candidates_limit: u32,
    /// Candidates must have at least one resume before applying.
    #[serde(default = "default_require_resume_for_apply")]
    pub require_resume_for_apply: bool,
    /// When true (dev/staging), every new user gets Premium regardless of slot count.
    #[serde(default)]
    pub auto_grant_yearly_premium: bool,
}

impl Default for SubscriptionSettings {
    fn default() -> Self {
        Self {
            founding_premium_limit: default_founding_premium_limit(),
            founding_premium_years: default_founding_premium_years(),
            yearly_price_usd: default_yearly_price_usd(),
            free_ai_matches_limit: default_free_ai_matches_limit(),
            free_active_jobs_limit: default_free_active_jobs_limit(),
            free_suggested_candidates_limit: default_free_suggested_candidates_limit(),
            premium_suggested_candidates_limit: default_premium_suggested_candidates_limit(),
            require_resume_for_apply: default_require_resume_for_apply(),
            auto_grant_yearly_premium: false,
        }
    }
}

fn default_founding_premium_limit() -> u32 {
    0
}

fn default_founding_premium_years() -> i64 {
    1
}

fn default_yearly_price_usd() -> u32 {
    199
}

fn default_free_ai_matches_limit() -> u32 {
    3
}

fn default_free_active_jobs_limit() -> u32 {
    2
}

fn default_free_suggested_candidates_limit() -> u32 {
    5
}

fn default_premium_suggested_candidates_limit() -> u32 {
    25
}

fn default_require_resume_for_apply() -> bool {
    true
}

/// Public homepage stats, with two modes controlled by `use_hardcoded`:
///
/// - `true` (default): `/stats` returns `live_jobs`/`companies`/`candidates`/
///   `new_jobs` straight from config. No DB access at all -- no boot-time
///   query, no background task ever spawned. Best performance, and honest
///   about the fact that "candidates" has no single obviously-correct live
///   definition (raw signups vs. resumes uploaded give very different
///   numbers).
/// - `false`: a background task recomputes real numbers from the DB every
///   `refresh_interval_seconds` and writes them into the `stats` table;
///   `/stats` reads that table instead of config. Use this once you actually
///   want live data (e.g. after real users start signing up).
///
/// Override via BFF__STATS__<FIELD> (e.g. BFF__STATS__USE_HARDCODED=false).
#[derive(serde::Deserialize, Clone)]
pub struct StatsSettings {
    #[serde(default = "default_stats_use_hardcoded")]
    pub use_hardcoded: bool,
    #[serde(default = "default_stats_refresh_interval_seconds")]
    pub refresh_interval_seconds: u64,
    #[serde(default = "default_stats_live_jobs")]
    pub live_jobs: i64,
    #[serde(default = "default_stats_companies")]
    pub companies: i64,
    #[serde(default = "default_stats_candidates")]
    pub candidates: i64,
    #[serde(default = "default_stats_new_jobs")]
    pub new_jobs: i64,
}

impl Default for StatsSettings {
    fn default() -> Self {
        Self {
            use_hardcoded: default_stats_use_hardcoded(),
            refresh_interval_seconds: default_stats_refresh_interval_seconds(),
            live_jobs: default_stats_live_jobs(),
            companies: default_stats_companies(),
            candidates: default_stats_candidates(),
            new_jobs: default_stats_new_jobs(),
        }
    }
}

fn default_stats_use_hardcoded() -> bool {
    true
}

fn default_stats_refresh_interval_seconds() -> u64 {
    3600
}

fn default_stats_live_jobs() -> i64 {
    764
}

fn default_stats_companies() -> i64 {
    500
}

fn default_stats_candidates() -> i64 {
    52417
}

fn default_stats_new_jobs() -> i64 {
    516
}

#[derive(serde::Deserialize, Clone)]
pub struct ObjectStorageSettings {
    pub endpoint: String,
    pub bucket: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    pub region: String,
}

#[derive(serde::Deserialize, Clone)]
pub struct DatabaseSettings {
    pub username: String,
    pub password: String,
    pub port: u16,
    pub host: String,
    pub database_name: String,
}

#[derive(serde::Deserialize, Clone)]
pub struct RedisSettings {
    pub host: String,
    pub port: u16,
    pub password: Option<String>,
    pub database: Option<u8>,
}

#[derive(serde::Deserialize, Clone)]
pub struct JwtSettings {
    pub secret: String,
    pub access_token_expiration_hours: i64,
    pub refresh_token_expiration_days: i64,
}

#[derive(serde::Deserialize, Clone)]
pub struct EmailSettings {
    pub api_key: String,
    pub from_email: String,
    pub from_name: String,
    pub base_url: String,
    /// Frontend URL for password reset links (e.g. http://localhost:5173).
    /// Override via env: APP_EMAIL__FRONTEND_BASE_URL
    #[serde(default)]
    pub frontend_base_url: Option<String>,
}

pub fn get_configuration() -> Result<Settings, config::ConfigError> {
    let base = config::File::new("configuration.yaml", config::FileFormat::Yaml);
    let env = config::Environment::default()
        .prefix("BFF")
        .separator("__")
        .ignore_empty(true);
    let settings = config::Config::builder()
        .add_source(base)
        .add_source(env)
        .build()?;
    // Try to convert the configuration values it read into
    // our Settings type
    settings.try_deserialize::<Settings>()
}

impl DatabaseSettings {
    pub fn connection_string(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}/{}",
            self.username, self.password, self.host, self.port, self.database_name
        )
    }
}

impl RedisSettings {
    pub fn connection_string(&self) -> String {
        let mut conn_str = format!("redis://{}:{}", self.host, self.port);

        if let Some(password) = &self.password {
            conn_str = format!("redis://:{}@{}:{}", password, self.host, self.port);
        }

        if let Some(database) = self.database {
            conn_str = format!("{}/{}", conn_str, database);
        }

        conn_str
    }
}
