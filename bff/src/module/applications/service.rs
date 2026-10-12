use crate::configuration::{MatcherSettings, SubscriptionSettings};
use crate::suggestions::skills;
use crate::module::applications::match_score;
use crate::module::applications::model::{
    Application, ApplicationDetailed, CreateApplicationRequest, JobApplicationCount,
    RecruiterInboxApplication, RecruiterOverview, UpdateApplicationRequest,
};
use crate::module::applications::repository::ApplicationRepository;
use crate::module::email::service::EmailService;
use crate::module::recruiter::repository::RecruiterRepository;
use crate::module::resume::repository::JobRepository;
use crate::module::resumes::repository::ResumeRepository;
use sqlx::PgPool;
use uuid::Uuid;

pub struct ApplicationService {
    repository: ApplicationRepository,
    resume_repository: ResumeRepository,
    recruiter_repository: RecruiterRepository,
    job_repository: JobRepository,
    email_service: EmailService,
    pool: PgPool,
    matcher: MatcherSettings,
    subscription_settings: SubscriptionSettings,
}

#[derive(Debug, thiserror::Error)]
pub enum ApplicationError {
    #[error("Upload a resume before applying to jobs.")]
    ResumeRequired,
    #[error("You have already applied to this job.")]
    AlreadyApplied,
    #[error("Job not found")]
    JobNotFound,
    #[error("You do not have access to this company's data")]
    Forbidden,
    #[error("Database error: {0}")]
    Database(String),
}

impl ApplicationService {
    pub fn new(
        repository: ApplicationRepository,
        resume_repository: ResumeRepository,
        recruiter_repository: RecruiterRepository,
        job_repository: JobRepository,
        email_service: EmailService,
        pool: PgPool,
        matcher: MatcherSettings,
        subscription_settings: SubscriptionSettings,
    ) -> Self {
        Self {
            repository,
            resume_repository,
            recruiter_repository,
            job_repository,
            email_service,
            pool,
            matcher,
            subscription_settings,
        }
    }

    pub async fn get_applications_by_user(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<Application>, Box<dyn std::error::Error>> {
        self.repository
            .find_by_user(user_id)
            .await
            .map_err(Into::into)
    }

    /// Verifies the recruiter is actually a member of `company_id` (admins bypass).
    /// This is the check that was missing on every company-scoped endpoint below.
    async fn ensure_company_access(
        &self,
        user_id: Uuid,
        role: &str,
        company_id: Uuid,
    ) -> Result<(), ApplicationError> {
        if role == "admin" {
            return Ok(());
        }
        let has_access = self
            .recruiter_repository
            .check_company_access(user_id, company_id)
            .await
            .map_err(|e| ApplicationError::Database(e.to_string()))?;
        if has_access {
            Ok(())
        } else {
            Err(ApplicationError::Forbidden)
        }
    }

    async fn ensure_job_access(
        &self,
        user_id: Uuid,
        role: &str,
        job_id: Uuid,
    ) -> Result<(), ApplicationError> {
        let job = self
            .job_repository
            .find_by_id(job_id)
            .await
            .map_err(|e| ApplicationError::Database(e.to_string()))?
            .ok_or(ApplicationError::JobNotFound)?;
        let company_id = job.company_id.ok_or(ApplicationError::JobNotFound)?;
        self.ensure_company_access(user_id, role, company_id).await
    }

    pub async fn get_applications_by_job(
        &self,
        user_id: Uuid,
        role: &str,
        job_id: Uuid,
    ) -> Result<Vec<Application>, ApplicationError> {
        self.ensure_job_access(user_id, role, job_id).await?;
        self.repository
            .find_by_job(job_id)
            .await
            .map_err(|e| ApplicationError::Database(e.to_string()))
    }

    pub async fn get_applications_by_job_detailed(
        &self,
        user_id: Uuid,
        role: &str,
        job_id: Uuid,
    ) -> Result<Vec<ApplicationDetailed>, ApplicationError> {
        self.ensure_job_access(user_id, role, job_id).await?;
        let mut apps = self
            .repository
            .find_by_job_detailed(job_id)
            .await
            .map_err(|e| ApplicationError::Database(e.to_string()))?;
        match_score::enrich_detailed_scores(&self.pool, &self.matcher, job_id, &mut apps).await;
        Ok(apps)
    }

    pub async fn get_recruiter_overview(
        &self,
        user_id: Uuid,
        role: &str,
        company_id: Uuid,
    ) -> Result<RecruiterOverview, ApplicationError> {
        self.ensure_company_access(user_id, role, company_id).await?;
        let (active_jobs, total_applications, new_applications_7d, pending_review) = self
            .repository
            .count_overview_stats(company_id)
            .await
            .map_err(|e| ApplicationError::Database(e.to_string()))?;

        let mut recent_applications = self
            .repository
            .find_inbox_by_company(company_id, 5)
            .await
            .map_err(|e| ApplicationError::Database(e.to_string()))?;
        match_score::enrich_inbox_scores(&self.pool, &self.matcher, &mut recent_applications)
            .await;
        match_score::sort_inbox_by_match(&mut recent_applications);

        let company = self
            .recruiter_repository
            .find_company_by_id(company_id)
            .await
            .map_err(|e| ApplicationError::Database(e.to_string()))?;

        let setup_complete = company
            .as_ref()
            .map(|c| !c.name.is_empty() && c.logo_url.is_some())
            .unwrap_or(false);

        Ok(RecruiterOverview {
            active_jobs,
            total_applications,
            new_applications_7d,
            pending_review,
            setup_complete,
            recent_applications,
        })
    }

    pub async fn get_recruiter_inbox(
        &self,
        user_id: Uuid,
        company_id: Option<Uuid>,
        limit: i64,
    ) -> Result<Vec<RecruiterInboxApplication>, Box<dyn std::error::Error>> {
        let mut apps = if let Some(cid) = company_id {
            if !self.recruiter_repository.check_company_access(user_id, cid).await? {
                return Err("Unauthorized company access".into());
            }
            self.repository.find_inbox_by_company(cid, limit).await?
        } else {
            self.repository.find_unified_inbox_by_recruiter(user_id, limit).await?
        };
        match_score::enrich_inbox_scores(&self.pool, &self.matcher, &mut apps).await;
        match_score::sort_inbox_by_match(&mut apps);
        Ok(apps)
    }

    pub async fn get_job_application_counts(
        &self,
        user_id: Uuid,
        role: &str,
        company_id: Uuid,
    ) -> Result<Vec<JobApplicationCount>, ApplicationError> {
        self.ensure_company_access(user_id, role, company_id).await?;
        self.repository
            .job_application_counts(company_id)
            .await
            .map_err(|e| ApplicationError::Database(e.to_string()))
    }

    pub async fn create_application(
        &self,
        user_id: Uuid,
        data: CreateApplicationRequest,
    ) -> Result<Application, ApplicationError> {
        if self.job_repository.find_by_id(data.job_id).await.ok().flatten().is_none() {
            return Err(ApplicationError::JobNotFound);
        }

        // Check for duplicate application first — gives a clearer error than
        // "upload a resume" when the candidate has already applied.
        let already_applied = self
            .repository
            .find_by_user_and_job(user_id, data.job_id)
            .await
            .map_err(|e| ApplicationError::Database(e.to_string()))?;
        if already_applied {
            return Err(ApplicationError::AlreadyApplied);
        }

        let resumes = self
            .resume_repository
            .find_by_user(user_id)
            .await
            .map_err(|e| ApplicationError::Database(e.to_string()))?;

        let usable_resume = resumes.iter().find(|r| {
            if r.file_name.is_some() || r.storage_path.is_some() || r.file_data.is_some() {
                return true;
            }
            let text = skills::resume_plain_text(Some(r.title.as_str()), r.content.as_ref());
            text.len() >= 8
        });

        if self.subscription_settings.require_resume_for_apply && usable_resume.is_none() {
            return Err(ApplicationError::ResumeRequired);
        }

        let resume_id = usable_resume.map(|r| r.id);

        let candidate_name = self
            .repository
            .find_user_display_name(user_id)
            .await
            .map_err(|e| ApplicationError::Database(e.to_string()))?;

        let app = self
            .repository
            .create(user_id, resume_id, data.clone())
            .await
            .map_err(|e| {
                if let sqlx::Error::Database(db) = &e {
                    if db.constraint().is_some() {
                        return ApplicationError::AlreadyApplied;
                    }
                }
                ApplicationError::Database(e.to_string())
            })?;

        if let Ok(Some(job)) = self.job_repository.find_by_id(data.job_id).await {
            if let Some(company_id) = job.company_id {
                let emails = self
                    .recruiter_repository
                    .recruiter_emails_for_company(company_id)
                    .await
                    .unwrap_or_default();

                for email in emails {
                    let _ = self
                        .email_service
                        .send_new_application_email(
                            &email,
                            &job.position_title,
                            &candidate_name,
                            &job.company_name,
                        )
                        .await;
                }
            }
        }

        Ok(app)
    }

    pub async fn update_application(
        &self,
        user_id: Uuid,
        role: &str,
        id: Uuid,
        data: UpdateApplicationRequest,
    ) -> Result<Option<Application>, ApplicationError> {
        let app = self
            .repository
            .find_by_id(id)
            .await
            .map_err(|e| ApplicationError::Database(e.to_string()))?;
        let Some(app) = app else {
            return Ok(None);
        };
        self.ensure_job_access(user_id, role, app.job_id).await?;

        if let Some(status) = data.status {
            let updated = self
                .repository
                .update_status(id, &status)
                .await
                .map_err(|e| ApplicationError::Database(e.to_string()))?;

            if let Some(ref updated_app) = updated {
                if let (Ok(Some(job)), Ok(Some((candidate_name, candidate_email)))) = (
                    self.job_repository.find_by_id(updated_app.job_id).await,
                    self.repository.find_user_contact(updated_app.user_id).await,
                ) {
                    let _ = self
                        .email_service
                        .send_application_status_email(
                            &candidate_email,
                            &candidate_name,
                            &job.position_title,
                            &job.company_name,
                            &status,
                        )
                        .await;
                }
            }

            Ok(updated)
        } else {
            Ok(None)
        }
    }

    /// Returns the resume id for `application_id`, but only if `user_id` (or an
    /// admin) actually has recruiter access to the company that owns the job.
    /// `company_id` from the caller is treated as a claim, not a fact — it's
    /// verified against `recruiter_companies` before anything is returned.
    pub async fn application_belongs_to_company(
        &self,
        user_id: Uuid,
        role: &str,
        application_id: Uuid,
        company_id: Uuid,
    ) -> Result<Option<Option<Uuid>>, ApplicationError> {
        if self
            .ensure_company_access(user_id, role, company_id)
            .await
            .is_err()
        {
            return Ok(None);
        }
        let app = self
            .repository
            .find_by_id(application_id)
            .await
            .map_err(|e| ApplicationError::Database(e.to_string()))?;
        let Some(app) = app else {
            return Ok(None);
        };
        let job = self
            .job_repository
            .find_by_id(app.job_id)
            .await
            .map_err(|e| ApplicationError::Database(e.to_string()))?;
        let Some(job) = job else {
            return Ok(None);
        };
        if job.company_id == Some(company_id) {
            Ok(Some(app.resume_id))
        } else {
            Ok(None)
        }
    }
}
