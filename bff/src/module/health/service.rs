use crate::module::health::model::HealthState;
use crate::{DbPool, RedisPool};

pub async fn check_database(
    pool: &DbPool,
) -> Result<HealthState, Box<dyn std::error::Error + Send + Sync>> {
    match sqlx::query("SELECT 1").fetch_one(pool).await {
        Ok(_) => Ok(HealthState::Healthy),
        Err(e) => Err(Box::new(e)),
    }
}

pub async fn check_authentication(
    pool: &DbPool,
) -> Result<HealthState, Box<dyn std::error::Error + Send + Sync>> {
    match sqlx::query("SELECT 1 FROM users LIMIT 1").fetch_optional(pool).await {
        Ok(_) => Ok(HealthState::Healthy),
        Err(e) => Err(Box::new(e)),
    }
}

pub async fn check_redis(
    redis_pool: &RedisPool,
) -> Result<HealthState, Box<dyn std::error::Error + Send + Sync>> {
    let mut conn = redis_pool.clone();
    match redis::cmd("PING").query_async::<String>(&mut conn).await {
        Ok(_) => Ok(HealthState::Healthy),
        Err(e) => Err(Box::new(e)),
    }
}
