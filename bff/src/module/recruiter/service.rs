use crate::configuration::{MatcherSettings, SubscriptionSettings};
use crate::module::applications::match_score;
use crate::module::recruiter::model::{
    Company, CreateCompanyRequest, CreateJobRequest, RecruiterError, RecruiterLimitsInfo,
    SuggestedCandidate, UpdateCompanyRequest, UpdateJobRequest,
};
use crate::module::email::service::EmailService;
use crate::module::recruiter::repository::RecruiterRepository;
use crate::module::resume::model::Job;
use crate::module::subscription::service::SubscriptionService;
use std::sync::Arc;
use uuid::Uuid;

pub struct RecruiterService {
    repository: RecruiterRepository,
    subscription: Arc<SubscriptionService>,
    matcher: MatcherSettings,
    pool: sqlx::PgPool,
    email: EmailService,
}

impl RecruiterService {
    pub fn new(
        repository: RecruiterRepository,
        subscription: Arc<SubscriptionService>,
        matcher: MatcherSettings,
        pool: sqlx::PgPool,
        email: EmailService,
    ) -> Self {
        Self {
            repository,
            subscription,
            matcher,
            pool,
            email,
        }
    }

    fn subscription_settings(&self) -> &SubscriptionSettings {
        self.subscription.settings()
    }

    pub async fn get_limits(
        &self,
        recruiter_id: Uuid,
        company_id: Uuid,
    ) -> Result<RecruiterLimitsInfo, RecruiterError> {
        let settings = self.subscription_settings();
        let is_premium = self
            .subscription
            .is_premium(recruiter_id)
            .await
            .map_err(|e| RecruiterError::Database(e.to_string()))?;
        let active_jobs = self
            .repository
            .count_active_jobs(company_id)
            .await
            .map_err(|e| RecruiterError::Database(e.to_string()))?;
        let limit = settings.free_active_jobs_limit;
        Ok(RecruiterLimitsInfo {
            is_premium,
            active_jobs,
            free_active_jobs_limit: limit,
            can_create_job: is_premium || active_jobs < limit as i64,
            can_feature_jobs: is_premium,
        })
    }

    async fn ensure_can_create_job(
        &self,
        recruiter_id: Uuid,
        company_id: Uuid,
    ) -> Result<(), RecruiterError> {
        let limits = self.get_limits(recruiter_id, company_id).await?;
        if !limits.can_create_job {
            return Err(RecruiterError::JobLimitReached {
                active: limits.active_jobs,
                limit: limits.free_active_jobs_limit,
            });
        }
        Ok(())
    }

    pub async fn ensure_company_access(
        &self,
        recruiter_id: Uuid,
        company_id: Uuid,
    ) -> Result<(), RecruiterError> {
        let has_access = self
            .repository
            .check_company_access(recruiter_id, company_id)
            .await
            .map_err(|e| RecruiterError::Database(e.to_string()))?;
        if !has_access {
            return Err(RecruiterError::Unauthorized);
        }
        Ok(())
    }

    pub async fn list_my_companies(&self, recruiter_id: Uuid) -> Result<Vec<Company>, Box<dyn std::error::Error>> {
        Ok(self.repository.list_companies_by_recruiter(recruiter_id).await?)
    }

    pub async fn create_company(
        &self,
        recruiter_id: Uuid,
        data: CreateCompanyRequest,
    ) -> Result<Company, Box<dyn std::error::Error>> {
        Ok(self.repository.create_company(recruiter_id, data).await?)
    }

    pub async fn update_company(
        &self,
        recruiter_id: Uuid,
        id: Uuid,
        data: UpdateCompanyRequest,
    ) -> Result<Option<Company>, Box<dyn std::error::Error>> {
        self.ensure_company_access(recruiter_id, id).await?;
        let company = self.repository.update_company(id, data).await?;
        Ok(company)
    }

    pub async fn get_company(
        &self,
        recruiter_id: Uuid,
        id: Uuid,
    ) -> Result<Option<Company>, Box<dyn std::error::Error>> {
        self.ensure_company_access(recruiter_id, id).await?;
        Ok(self.repository.find_company_by_id(id).await?)
    }

    pub async fn list_jobs(
        &self,
        recruiter_id: Uuid,
        company_id: Uuid,
    ) -> Result<Vec<Job>, Box<dyn std::error::Error>> {
        self.ensure_company_access(recruiter_id, company_id).await?;
        Ok(self.repository.list_jobs_by_company(company_id).await?)
    }

    pub async fn create_job(
        &self,
        recruiter_id: Uuid,
        data: CreateJobRequest,
    ) -> Result<Job, RecruiterError> {
        self.ensure_company_access(recruiter_id, data.company_id).await?;
        self.ensure_can_create_job(recruiter_id, data.company_id)
            .await?;
        let job = self
            .repository
            .create_job(data)
            .await
            .map_err(|e| RecruiterError::Database(e.to_string()))?;
        Ok(job)
    }

    pub async fn update_job(
        &self,
        recruiter_id: Uuid,
        id: Uuid,
        company_id: Uuid,
        data: UpdateJobRequest,
    ) -> Result<Option<Job>, RecruiterError> {
        self.ensure_company_access(recruiter_id, company_id).await?;
        if data.featured == Some(true) {
            let is_premium = self
                .subscription
                .is_premium(recruiter_id)
                .await
                .map_err(|e| RecruiterError::Database(e.to_string()))?;
            if !is_premium {
                return Err(RecruiterError::FeaturedRequiresPremium);
            }
        }

        let job = self
            .repository
            .update_job(id, company_id, data)
            .await
            .map_err(|e| RecruiterError::Database(e.to_string()))?;
        if let Some(ref job) = job {
            if job.status.as_deref() == Some("closed") {
                let _ = self.repository.purge_suggested_jobs_for_job(job.id).await;
            }
        }
        Ok(job)
    }

    pub async fn duplicate_job(
        &self,
        recruiter_id: Uuid,
        id: Uuid,
        company_id: Uuid,
    ) -> Result<Option<Job>, RecruiterError> {
        self.ensure_company_access(recruiter_id, company_id).await?;
        self.ensure_can_create_job(recruiter_id, company_id)
            .await?;
        let job = self
            .repository
            .duplicate_job(id, company_id)
            .await
            .map_err(|e| RecruiterError::Database(e.to_string()))?;
        Ok(job)
    }

    pub async fn suggested_candidates_for_job(
        &self,
        recruiter_id: Uuid,
        job_id: Uuid,
        company_id: Uuid,
    ) -> Result<Vec<SuggestedCandidate>, RecruiterError> {
        self.ensure_company_access(recruiter_id, company_id).await?;
        let _job = self
            .repository
            .find_job_by_id(job_id)
            .await
            .map_err(|e| RecruiterError::Database(e.to_string()))?
            .filter(|j| j.company_id == Some(company_id))
            .ok_or(RecruiterError::JobNotFound)?;

        let settings = self.subscription_settings();
        let is_premium = self
            .subscription
            .is_premium(recruiter_id)
            .await
            .map_err(|e| RecruiterError::Database(e.to_string()))?;
        let pool_limit = if is_premium {
            settings.premium_suggested_candidates_limit
        } else {
            settings.free_suggested_candidates_limit
        };
        let fetch_limit = (pool_limit as i64).saturating_mul(4).max(20);

        let rows = self
            .repository
            .candidate_pool_for_job(job_id, fetch_limit)
            .await
            .map_err(|e| RecruiterError::Database(e.to_string()))?;

        if rows.is_empty() {
            return Ok(vec![]);
        }

        let user_ids: Vec<Uuid> = rows.iter().map(|r| r.0).collect();
        let scores =
            match_score::resolve_scores_for_job(&self.pool, &self.matcher, job_id, &user_ids).await;

        let mut candidates: Vec<SuggestedCandidate> = rows
            .into_iter()
            .map(|(user_id, name, email, title, file_name, is_premium_candidate)| {
                let score = scores.get(&user_id).copied().unwrap_or(0.0);
                SuggestedCandidate {
                    user_id,
                    candidate_name: name,
                    candidate_email: email,
                    resume_title: title,
                    resume_file_name: file_name,
                    match_score: score,
                    already_applied: false,
                    is_premium_candidate,
                }
            })
            .collect();

        candidates.sort_by(|a, b| {
            match b.is_premium_candidate.cmp(&a.is_premium_candidate) {
                std::cmp::Ordering::Equal => b.match_score
                    .partial_cmp(&a.match_score)
                    .unwrap_or(std::cmp::Ordering::Equal),
                other => other,
            }
        });
        candidates.truncate(pool_limit as usize);

        Ok(candidates)
    }

    /// Recruiter-initiated outreach to a suggested candidate — an email, not
    /// in-app chat. The candidate's email was already visible to the
    /// recruiter via `suggested_candidates_for_job`; this just closes the
    /// loop instead of leaving them to email manually outside the app.
    pub async fn request_intro(
        &self,
        recruiter_id: Uuid,
        company_id: Uuid,
        job_id: Uuid,
        candidate_user_id: Uuid,
        note: Option<String>,
    ) -> Result<(), RecruiterError> {
        self.ensure_company_access(recruiter_id, company_id).await?;
        let job = self
            .repository
            .find_job_by_id(job_id)
            .await
            .map_err(|e| RecruiterError::Database(e.to_string()))?
            .filter(|j| j.company_id == Some(company_id))
            .ok_or(RecruiterError::JobNotFound)?;

        let (recruiter_name, _recruiter_email) = self
            .repository
            .find_user_contact(recruiter_id)
            .await
            .map_err(|e| RecruiterError::Database(e.to_string()))?
            .unwrap_or_else(|| ("A recruiter".to_string(), String::new()));

        let (candidate_name, candidate_email) = self
            .repository
            .find_user_contact(candidate_user_id)
            .await
            .map_err(|e| RecruiterError::Database(e.to_string()))?
            .ok_or(RecruiterError::JobNotFound)?;

        self.email
            .send_recruiter_intro_email(
                &candidate_email,
                &candidate_name,
                &recruiter_name,
                &job.company_name,
                &job.position_title,
                note.as_deref(),
            )
            .await
            .map_err(|e| RecruiterError::Database(e.to_string()))?;

        Ok(())
    }

    pub async fn create_talent_pool(
        &self,
        recruiter_id: Uuid,
        company_id: Uuid,
        name: &str,
    ) -> Result<crate::module::recruiter::model::TalentPool, RecruiterError> {
        self.ensure_company_access(recruiter_id, company_id).await?;
        self.repository.create_talent_pool(company_id, name).await.map_err(|e| RecruiterError::Database(e.to_string()))
    }

    pub async fn list_talent_pools(
        &self,
        recruiter_id: Uuid,
        company_id: Uuid,
    ) -> Result<Vec<crate::module::recruiter::model::TalentPool>, RecruiterError> {
        self.ensure_company_access(recruiter_id, company_id).await?;
        self.repository.list_talent_pools(company_id).await.map_err(|e| RecruiterError::Database(e.to_string()))
    }

    pub async fn get_talent_pool(
        &self,
        recruiter_id: Uuid,
        company_id: Uuid,
        pool_id: Uuid,
    ) -> Result<Option<crate::module::recruiter::model::TalentPool>, RecruiterError> {
        self.ensure_company_access(recruiter_id, company_id).await?;
        self.repository.get_talent_pool(pool_id, company_id).await.map_err(|e| RecruiterError::Database(e.to_string()))
    }

    pub async fn add_resume_to_pool(
        &self,
        pool_id: Uuid,
        user_id: Uuid,
        resume_id: Uuid,
    ) -> Result<(), RecruiterError> {
        self.repository.add_resume_to_pool(pool_id, user_id, resume_id).await.map_err(|e| RecruiterError::Database(e.to_string()))
    }

    pub async fn list_pool_candidates(
        &self,
        recruiter_id: Uuid,
        company_id: Uuid,
        pool_id: Uuid,
    ) -> Result<Vec<crate::module::recruiter::model::PoolCandidateDetail>, RecruiterError> {
        self.ensure_company_access(recruiter_id, company_id).await?;
        self.repository.list_pool_candidates(pool_id).await.map_err(|e| RecruiterError::Database(e.to_string()))
    }

    pub async fn delete_talent_pool(
        &self,
        recruiter_id: Uuid,
        company_id: Uuid,
        pool_id: Uuid,
    ) -> Result<bool, RecruiterError> {
        self.ensure_company_access(recruiter_id, company_id).await?;
        self.repository.delete_talent_pool(pool_id, company_id).await.map_err(|e| RecruiterError::Database(e.to_string()))
    }
}
