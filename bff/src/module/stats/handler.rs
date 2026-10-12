use crate::DbPool;
use crate::configuration::Settings;
use crate::module::stats::repository;
use actix_web::{HttpResponse, Responder, web};
use chrono::Utc;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct StatsResponse {
    pub live_jobs: i64,
    pub companies: i64,
    pub candidates: i64,
    pub new_jobs: i64,
    pub updated_at: String,
}

pub async fn get_stats(config: web::Data<Settings>, pool: web::Data<DbPool>) -> impl Responder {
    if config.stats.use_hardcoded {
        return HttpResponse::Ok().json(StatsResponse {
            live_jobs: config.stats.live_jobs,
            companies: config.stats.companies,
            candidates: config.stats.candidates,
            new_jobs: config.stats.new_jobs,
            updated_at: Utc::now().to_rfc3339(),
        });
    }

    match repository::get_stats(pool.get_ref()).await {
        Ok(Some(row)) => HttpResponse::Ok().json(StatsResponse {
            live_jobs: row.live_jobs,
            companies: row.companies,
            candidates: row.candidates,
            new_jobs: row.new_jobs,
            updated_at: row.updated_at.to_rfc3339(),
        }),
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(e) => {
            log::error!("Failed to fetch stats: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}
