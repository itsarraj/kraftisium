use crate::module::resume::model::{Job, JobFilter, JobPageResponse, JobSearchQuery};
use crate::module::resume::repository::JobRepository;
use crate::search::JobSearchIndex;
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

pub struct JobService {
    repository: JobRepository,
    search_index: Arc<JobSearchIndex>,
}

impl JobService {
    pub fn new(repository: JobRepository, search_index: Arc<JobSearchIndex>) -> Self {
        Self {
            repository,
            search_index,
        }
    }

    pub async fn search_jobs(
        &self,
        query: JobSearchQuery,
    ) -> Result<JobPageResponse, Box<dyn std::error::Error + Send + Sync>> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(12);

        let page_result = self
            .search_index
            .search(query.q.as_deref(), query.location.as_deref(), page, limit)
            .await?;

        let ids: Vec<Uuid> = page_result.hits.iter().map(|h| h.job_id).collect();
        let jobs = self.repository.find_by_ids(&ids).await?;
        let by_id: HashMap<Uuid, Job> = jobs.into_iter().map(|j| (j.id, j)).collect();
        let ordered: Vec<Job> = ids
            .iter()
            .filter_map(|id| by_id.get(id).cloned())
            .collect();

        let total_count = page_result.total_count as i64;
        let total_pages = if total_count == 0 {
            0
        } else {
            (total_count as f64 / limit as f64).ceil() as i64
        };

        Ok(JobPageResponse {
            jobs: ordered,
            total_count,
            page,
            total_pages,
        })
    }

    pub async fn get_jobs(
        &self,
        filter: JobFilter,
    ) -> Result<JobPageResponse, Box<dyn std::error::Error + Send + Sync>> {
        let page = filter.page.unwrap_or(1);
        let limit = filter.limit.unwrap_or(10);

        let (jobs, total_count) = self.repository.find_all(filter).await?;
        let total_pages = (total_count as f64 / limit as f64).ceil() as i64;

        Ok(JobPageResponse {
            jobs,
            total_count,
            page,
            total_pages,
        })
    }

    pub async fn get_suggested_jobs(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<Job>, Box<dyn std::error::Error + Send + Sync>> {
        let jobs = self.repository.find_suggested_for_user(user_id).await?;
        Ok(jobs)
    }

    pub async fn get_job_by_id(
        &self,
        id: Uuid,
    ) -> Result<Option<Job>, Box<dyn std::error::Error + Send + Sync>> {
        let job = self.repository.find_by_id(id).await?;
        Ok(job)
    }
}
