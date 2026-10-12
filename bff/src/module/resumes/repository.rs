use crate::module::resumes::model::{CreateResumeRequest, Resume, UpdateResumeRequest};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct ResumeRepository {
    pool: PgPool,
}

impl ResumeRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_user(&self, user_id: Uuid) -> Result<Vec<Resume>, sqlx::Error> {
        sqlx::query_as::<_, Resume>(
            "SELECT * FROM resumes WHERE user_id = $1 ORDER BY updated_at DESC",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn find_by_id(&self, id: Uuid, user_id: Uuid) -> Result<Option<Resume>, sqlx::Error> {
        sqlx::query_as::<_, Resume>("SELECT * FROM resumes WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn find_by_id_unscoped(&self, id: Uuid) -> Result<Option<Resume>, sqlx::Error> {
        sqlx::query_as::<_, Resume>("SELECT * FROM resumes WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn create(
        &self,
        user_id: Uuid,
        data: CreateResumeRequest,
    ) -> Result<Resume, sqlx::Error> {
        sqlx::query_as::<_, Resume>(
            r#"
            INSERT INTO resumes (user_id, title, content)
            VALUES ($1, $2, $3)
            RETURNING *
            "#,
        )
        .bind(user_id)
        .bind(data.title)
        .bind(data.content)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn create_with_file(
        &self,
        resume_id: Uuid,
        user_id: Uuid,
        title: String,
        file_name: String,
        file_type: String,
        file_size: i32,
        storage_path: String,
    ) -> Result<Resume, sqlx::Error> {
        sqlx::query_as::<_, Resume>(
            r#"
            INSERT INTO resumes (id, user_id, title, content, file_name, file_type, file_size, storage_path)
            VALUES ($1, $2, $3, NULL, $4, $5, $6, $7)
            RETURNING *
            "#
        )
        .bind(resume_id)
        .bind(user_id)
        .bind(title)
        .bind(file_name)
        .bind(file_type)
        .bind(file_size)
        .bind(storage_path)
        .fetch_one(&self.pool)
        .await
    }

    /// Fallback: store file in DB when object storage is unavailable
    pub async fn create_with_file_db(
        &self,
        resume_id: Uuid,
        user_id: Uuid,
        title: String,
        file_name: String,
        file_type: String,
        file_size: i32,
        file_data: Vec<u8>,
    ) -> Result<Resume, sqlx::Error> {
        sqlx::query_as::<_, Resume>(
            r#"
            INSERT INTO resumes (id, user_id, title, content, file_name, file_type, file_size, file_data)
            VALUES ($1, $2, $3, NULL, $4, $5, $6, $7)
            RETURNING *
            "#
        )
        .bind(resume_id)
        .bind(user_id)
        .bind(title)
        .bind(file_name)
        .bind(file_type)
        .bind(file_size)
        .bind(file_data)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update(
        &self,
        id: Uuid,
        user_id: Uuid,
        data: UpdateResumeRequest,
    ) -> Result<Option<Resume>, sqlx::Error> {
        let existing = self.find_by_id(id, user_id).await?;
        let Some(existing) = existing else {
            return Ok(None);
        };

        let title = data.title.unwrap_or(existing.title);
        let content = data.content.or(existing.content);

        let updated = sqlx::query_as::<_, Resume>(
            r#"
            UPDATE resumes SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND user_id = $4
            RETURNING *
            "#,
        )
        .bind(title)
        .bind(content)
        .bind(id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(updated)
    }

    pub async fn delete(&self, id: Uuid, user_id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM resumes WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
