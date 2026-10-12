use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Resume {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub content: Option<serde_json::Value>,
    pub file_name: Option<String>,
    pub file_type: Option<String>,
    pub file_size: Option<i32>,
    #[serde(skip_serializing)]
    pub file_data: Option<Vec<u8>>,
    #[serde(skip_serializing)]
    pub storage_path: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateResumeRequest {
    pub title: String,
    pub content: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateResumeRequest {
    pub title: Option<String>,
    pub content: Option<serde_json::Value>,
}
