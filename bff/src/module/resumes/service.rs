use crate::module::resumes::model::{CreateResumeRequest, Resume, UpdateResumeRequest};
use crate::module::resumes::repository::ResumeRepository;
use crate::storage::RustFsStorage;
use std::sync::Arc;
use uuid::Uuid;

pub struct ResumeService {
    repository: ResumeRepository,
    storage: Arc<RustFsStorage>,
    user_repo: crate::module::auth::repository::UserRepository,
}

impl ResumeService {
    pub fn new(repository: ResumeRepository, storage: Arc<RustFsStorage>, user_repo: crate::module::auth::repository::UserRepository) -> Self {
        Self {
            repository,
            storage,
            user_repo,
        }
    }

    pub async fn get_resumes(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<Resume>, Box<dyn std::error::Error>> {
        self.repository
            .find_by_user(user_id)
            .await
            .map_err(Into::into)
    }

    pub async fn get_resume(
        &self,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<Resume>, Box<dyn std::error::Error>> {
        self.repository
            .find_by_id(id, user_id)
            .await
            .map_err(Into::into)
    }

    pub async fn get_resume_file_bytes(
        &self,
        resume_id: Uuid,
    ) -> Result<Option<(String, String, Vec<u8>)>, Box<dyn std::error::Error>> {
        let resume = self.repository.find_by_id_unscoped(resume_id).await?;
        let Some(resume) = resume else {
            return Ok(None);
        };

        if let Some(data) = resume.file_data {
            let name = resume.file_name.unwrap_or_else(|| "resume.pdf".to_string());
            let ct = resume
                .file_type
                .unwrap_or_else(|| "application/octet-stream".to_string());
            return Ok(Some((name, ct, data)));
        }

        if let Some(ref path) = resume.storage_path {
            match self.storage.get(path).await {
                Ok(data) => {
                    let name = resume.file_name.unwrap_or_else(|| "resume.pdf".to_string());
                    let ct = resume
                        .file_type
                        .unwrap_or_else(|| "application/octet-stream".to_string());
                    return Ok(Some((name, ct, data)));
                }
                Err(e) => {
                    log::warn!("Failed to fetch resume from storage {}: {}", path, e);
                }
            }
        }

        if let Some(ref content) = resume.content {
            let name = format!("{}.json", resume.title.replace(' ', "_"));
            let data = serde_json::to_vec_pretty(content).unwrap_or_default();
            return Ok(Some((name, "application/json".to_string(), data)));
        }

        Ok(None)
    }

    pub async fn create_resume(
        &self,
        user_id: Uuid,
        data: CreateResumeRequest,
    ) -> Result<Resume, Box<dyn std::error::Error>> {
        let resume = self.repository
            .create(user_id, data)
            .await?;
            
        // Check referral credit grant
        let user_resumes_count = self.repository.find_by_user(user_id).await.unwrap_or_default().len();
        if user_resumes_count == 1 {
            if let Ok(Some(user)) = self.user_repo.find_by_id(user_id).await {
                if let Some(referrer_id) = user.referred_by {
                    if let Ok(settings) = self.user_repo.find_referral_settings().await {
                        let _ = self.user_repo.add_referral_credits(
                            referrer_id,
                            settings.credits_per_referral,
                            &format!("Referral completed by user {}", user_id),
                        ).await;
                    }
                }
            }
        }
        Ok(resume)
    }

    pub async fn create_resume_with_file(
        &self,
        user_id: Uuid,
        title: String,
        file_name: String,
        file_type: String,
        file_size: i32,
        file_data: Vec<u8>,
    ) -> Result<Resume, Box<dyn std::error::Error>> {
        let resume_id = Uuid::new_v4();

        let resume = match self
            .storage
            .store(user_id, resume_id, &file_name, &file_data, &file_type)
            .await
        {
            Ok(storage_path) => self
                .repository
                .create_with_file(
                    resume_id,
                    user_id,
                    title,
                    file_name,
                    file_type,
                    file_size,
                    storage_path,
                )
                .await,
            Err(e) => {
                log::warn!("RustFS unavailable ({}), falling back to DB storage", e);
                self.repository
                    .create_with_file_db(
                        resume_id, user_id, title, file_name, file_type, file_size, file_data,
                    )
                    .await
            }
        }?;
        
        // Check referral credit grant
        let user_resumes_count = self.repository.find_by_user(user_id).await.unwrap_or_default().len();
        if user_resumes_count == 1 {
            if let Ok(Some(user)) = self.user_repo.find_by_id(user_id).await {
                if let Some(referrer_id) = user.referred_by {
                    if let Ok(settings) = self.user_repo.find_referral_settings().await {
                        let _ = self.user_repo.add_referral_credits(
                            referrer_id,
                            settings.credits_per_referral,
                            &format!("Referral completed by user {}", user_id),
                        ).await;
                    }
                }
            }
        }
        
        Ok(resume)
    }

    pub async fn update_resume(
        &self,
        id: Uuid,
        user_id: Uuid,
        data: UpdateResumeRequest,
    ) -> Result<Option<Resume>, Box<dyn std::error::Error>> {
        self.repository
            .update(id, user_id, data)
            .await
            .map_err(Into::into)
    }

    pub async fn delete_resume(
        &self,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        if let Ok(Some(resume)) = self.repository.find_by_id(id, user_id).await {
            if let Some(ref path) = resume.storage_path {
                if let Err(e) = self.storage.delete(path).await {
                    log::warn!("Failed to delete from storage {}: {}", path, e);
                }
            }
        }
        self.repository
            .delete(id, user_id)
            .await
            .map_err(Into::into)
    }
}
