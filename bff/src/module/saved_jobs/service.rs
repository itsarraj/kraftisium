use crate::module::resume::model::Job;
use crate::module::saved_jobs::repository::SavedJobsRepository;
use uuid::Uuid;

pub struct SavedJobsService {
    repository: SavedJobsRepository,
}

impl SavedJobsService {
    pub fn new(repository: SavedJobsRepository) -> Self {
        Self { repository }
    }

    pub async fn save(&self, user_id: Uuid, job_id: Uuid) -> Result<(), Box<dyn std::error::Error>> {
        self.repository.save(user_id, job_id).await.map_err(Into::into)
    }

    pub async fn unsave(&self, user_id: Uuid, job_id: Uuid) -> Result<(), Box<dyn std::error::Error>> {
        self.repository.unsave(user_id, job_id).await.map_err(Into::into)
    }

    pub async fn list(&self, user_id: Uuid) -> Result<Vec<Job>, Box<dyn std::error::Error>> {
        self.repository.list(user_id).await.map_err(Into::into)
    }
}
