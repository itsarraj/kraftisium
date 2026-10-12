use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Application {
    pub id: Uuid,
    pub job_id: Uuid,
    pub user_id: Uuid,
    pub resume_id: Option<Uuid>,
    pub status: String,
    pub applied_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateApplicationRequest {
    pub job_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateApplicationRequest {
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ApplicationDetailed {
    pub id: Uuid,
    pub job_id: Uuid,
    pub user_id: Uuid,
    pub resume_id: Option<Uuid>,
    pub status: String,
    pub applied_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub candidate_name: String,
    pub candidate_email: String,
    pub candidate_bio: Option<String>,
    pub resume_title: Option<String>,
    pub resume_file_name: Option<String>,
    pub match_score: Option<f64>,
    pub position_title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RecruiterInboxApplication {
    pub id: Uuid,
    pub job_id: Uuid,
    pub user_id: Uuid,
    pub resume_id: Option<Uuid>,
    pub status: String,
    pub applied_at: DateTime<Utc>,
    pub candidate_name: String,
    pub candidate_email: String,
    pub resume_file_name: Option<String>,
    pub match_score: Option<f64>,
    pub position_title: String,
    pub company_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecruiterOverview {
    pub active_jobs: i64,
    pub total_applications: i64,
    pub new_applications_7d: i64,
    pub pending_review: i64,
    pub setup_complete: bool,
    pub recent_applications: Vec<RecruiterInboxApplication>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct JobApplicationCount {
    pub job_id: Uuid,
    pub position_title: String,
    pub status: String,
    pub application_count: i64,
    pub new_count_7d: i64,
}
