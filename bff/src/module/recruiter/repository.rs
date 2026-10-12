use crate::module::recruiter::model::{Company, CreateCompanyRequest, CreateJobRequest, UpdateCompanyRequest, UpdateJobRequest};
use crate::module::resume::model::Job;
use crate::module::resume::sql::{JOB_FROM_JOIN, JOB_SELECT};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct RecruiterRepository {
    pool: PgPool,
}

impl RecruiterRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_company(&self, user_id: Uuid, data: CreateCompanyRequest) -> Result<Company, sqlx::Error> {
        let mut tx = self.pool.begin().await?;
        let row = sqlx::query(
            r#"
            INSERT INTO companies (name, logo_url, website, about, industry, employee_size, head_office, company_type, since, specialization)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
        )
        .bind(data.name)
        .bind(data.logo_url)
        .bind(data.website)
        .bind(data.about)
        .bind(data.industry)
        .bind(data.employee_size)
        .bind(data.head_office)
        .bind(data.company_type)
        .bind(data.since)
        .bind(data.specialization)
        .fetch_one(&mut *tx)
        .await?;

        let company: Company = sqlx::FromRow::from_row(&row)?;

        // Link company to recruiter
        sqlx::query(
            "INSERT INTO recruiter_companies (user_id, company_id, role) VALUES ($1, $2, 'owner')"
        )
        .bind(user_id)
        .bind(company.id)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(company)
    }
    pub async fn update_company(
        &self,
        id: Uuid,
        data: UpdateCompanyRequest,
    ) -> Result<Option<Company>, sqlx::Error> {
        let existing = self.find_company_by_id(id).await?;
        let Some(existing) = existing else {
            return Ok(None);
        };

        let company = sqlx::query_as::<_, Company>(
            r#"
            UPDATE companies SET
                name = $1,
                logo_url = $2,
                website = $3,
                about = $4,
                industry = $5,
                employee_size = $6,
                head_office = $7,
                company_type = $8,
                since = $9,
                specialization = $10,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $11
            RETURNING *
            "#,
        )
        .bind(data.name.unwrap_or(existing.name))
        .bind(data.logo_url.or(existing.logo_url))
        .bind(data.website.or(existing.website))
        .bind(data.about.or(existing.about))
        .bind(data.industry.or(existing.industry))
        .bind(data.employee_size.or(existing.employee_size))
        .bind(data.head_office.or(existing.head_office))
        .bind(data.company_type.or(existing.company_type))
        .bind(data.since.or(existing.since))
        .bind(data.specialization.or(existing.specialization))
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(ref updated) = company {
            sqlx::query(
                r#"
                UPDATE jobs SET
                    company_name = $1,
                    company_logo_url = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE company_id = $3
                "#,
            )
            .bind(&updated.name)
            .bind(&updated.logo_url)
            .bind(id)
            .execute(&self.pool)
            .await?;
        }

        Ok(company)
    }

    pub async fn check_company_access(&self, user_id: Uuid, company_id: Uuid) -> Result<bool, sqlx::Error> {
        let exists: (bool,) = sqlx::query_as(
            "SELECT EXISTS(SELECT 1 FROM recruiter_companies WHERE user_id = $1 AND company_id = $2)"
        )
        .bind(user_id)
        .bind(company_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(exists.0)
    }

    pub async fn list_companies_by_recruiter(&self, user_id: Uuid) -> Result<Vec<Company>, sqlx::Error> {
        sqlx::query_as::<_, Company>(
            r#"
            SELECT c.* 
            FROM companies c
            INNER JOIN recruiter_companies rc ON c.id = rc.company_id
            WHERE rc.user_id = $1
            ORDER BY c.name ASC
            "#
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn find_company_by_id(&self, id: Uuid) -> Result<Option<Company>, sqlx::Error> {
        sqlx::query_as::<_, Company>("SELECT * FROM companies WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn count_active_jobs(&self, company_id: Uuid) -> Result<i64, sqlx::Error> {
        let row: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*) FROM jobs
            WHERE company_id = $1 AND COALESCE(status, 'active') = 'active'
            "#,
        )
        .bind(company_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row.0)
    }

    pub async fn list_jobs_by_company(&self, company_id: Uuid) -> Result<Vec<Job>, sqlx::Error> {
        sqlx::query_as::<_, Job>(&format!(
            "SELECT {JOB_SELECT} {JOB_FROM_JOIN}
            WHERE j.company_id = $1
            ORDER BY j.featured DESC, j.posted_at DESC"
        ))
        .bind(company_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn candidate_pool_for_job(
        &self,
        job_id: Uuid,
        limit: i64,
    ) -> Result<Vec<(Uuid, String, String, Option<String>, Option<String>, bool)>, sqlx::Error> {
        sqlx::query_as(
            r#"
            SELECT DISTINCT ON (u.is_premium_candidate, u.id)
                u.id,
                u.name,
                u.email,
                r.title,
                r.file_name,
                u.is_premium_candidate
            FROM users u
            INNER JOIN resumes r ON r.user_id = u.id
            WHERE u.role = 'user'
              AND NOT EXISTS (
                  SELECT 1 FROM applications a
                  WHERE a.user_id = u.id AND a.job_id = $1
              )
            ORDER BY u.is_premium_candidate DESC, u.id, r.updated_at DESC
            LIMIT $2
            "#,
        )
        .bind(job_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn find_job_by_id(&self, id: Uuid) -> Result<Option<Job>, sqlx::Error> {
        sqlx::query_as::<_, Job>(&format!(
            "SELECT {JOB_SELECT} {JOB_FROM_JOIN} WHERE j.id = $1"
        ))
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn find_user_contact(
        &self,
        user_id: Uuid,
    ) -> Result<Option<(String, String)>, sqlx::Error> {
        sqlx::query_as::<_, (String, String)>("SELECT name, email FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn create_job(&self, data: CreateJobRequest) -> Result<Job, sqlx::Error> {
        let company = self
            .find_company_by_id(data.company_id)
            .await?
            .ok_or_else(|| sqlx::Error::RowNotFound)?;

        let job = sqlx::query_as::<_, Job>(
            r#"
            INSERT INTO jobs (
                company_id, company_name, company_logo_url, position_title, location,
                employment_type, salary_min, salary_max, salary_currency, salary_period,
                description, requirements, facilities, tags, status, posted_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active', CURRENT_TIMESTAMP)
            RETURNING *
            "#,
        )
        .bind(company.id)
        .bind(company.name)
        .bind(company.logo_url)
        .bind(data.position_title)
        .bind(data.location)
        .bind(data.employment_type)
        .bind(data.salary_min)
        .bind(data.salary_max)
        .bind(data.salary_currency)
        .bind(data.salary_period)
        .bind(data.description)
        .bind(data.requirements)
        .bind(data.facilities)
        .bind(data.tags.as_ref())
        .fetch_one(&self.pool)
        .await?;

        self.find_job_by_id(job.id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)
    }

    pub async fn purge_suggested_jobs_for_job(&self, job_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM suggested_jobs WHERE job_id = $1")
            .bind(job_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn update_job(
        &self,
        id: Uuid,
        company_id: Uuid,
        data: UpdateJobRequest,
    ) -> Result<Option<Job>, sqlx::Error> {
        let existing = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE id = $1 AND company_id = $2",
        )
        .bind(id)
        .bind(company_id)
        .fetch_optional(&self.pool)
        .await?;

        let Some(existing) = existing else {
            return Ok(None);
        };

        let job = sqlx::query_as::<_, Job>(
            r#"
            UPDATE jobs SET
                position_title = $1,
                location = $2,
                employment_type = $3,
                salary_min = $4,
                salary_max = $5,
                salary_currency = $6,
                salary_period = $7,
                description = $8,
                status = $9,
                featured = $10,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $11 AND company_id = $12
            RETURNING *
            "#,
        )
        .bind(data.position_title.unwrap_or(existing.position_title))
        .bind(data.location.unwrap_or(existing.location))
        .bind(data.employment_type.unwrap_or(existing.employment_type))
        .bind(data.salary_min.or(existing.salary_min))
        .bind(data.salary_max.or(existing.salary_max))
        .bind(data.salary_currency.or(existing.salary_currency))
        .bind(data.salary_period.or(existing.salary_period))
        .bind(data.description.or(existing.description))
        .bind(data.status.unwrap_or_else(|| existing.status.unwrap_or_else(|| "active".to_string())))
        .bind(data.featured.unwrap_or(existing.featured))
        .bind(id)
        .bind(company_id)
        .fetch_optional(&self.pool)
        .await?;

        match job {
            Some(j) => Ok(self.find_job_by_id(j.id).await?),
            None => Ok(None),
        }
    }

    pub async fn duplicate_job(&self, id: Uuid, company_id: Uuid) -> Result<Option<Job>, sqlx::Error> {
        let existing = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE id = $1 AND company_id = $2",
        )
        .bind(id)
        .bind(company_id)
        .fetch_optional(&self.pool)
        .await?;

        let Some(src) = existing else {
            return Ok(None);
        };

        let company = self
            .find_company_by_id(company_id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)?;

        let title = format!("{} (Copy)", src.position_title);
        let job = sqlx::query_as::<_, Job>(
            r#"
            INSERT INTO jobs (
                company_id, company_name, company_logo_url, position_title, location,
                employment_type, salary_min, salary_max, salary_currency, salary_period,
                description, requirements, facilities, tags, status, posted_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active', CURRENT_TIMESTAMP)
            RETURNING *
            "#,
        )
        .bind(company_id)
        .bind(company.name)
        .bind(company.logo_url)
        .bind(title)
        .bind(src.location)
        .bind(src.employment_type)
        .bind(src.salary_min)
        .bind(src.salary_max)
        .bind(src.salary_currency)
        .bind(src.salary_period)
        .bind(src.description)
        .bind(src.requirements)
        .bind(src.facilities)
        .bind(src.tags.as_ref())
        .fetch_one(&self.pool)
        .await?;

        Ok(self.find_job_by_id(job.id).await?)
    }

    pub async fn recruiter_emails_for_company(
        &self,
        company_id: Uuid,
    ) -> Result<Vec<String>, sqlx::Error> {
        let rows: Vec<(String,)> = sqlx::query_as(
            r#"
            SELECT u.email
            FROM employer_profiles ep
            JOIN users u ON u.id = ep.user_id
            WHERE ep.company_id = $1
            "#,
        )
        .bind(company_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    pub async fn create_talent_pool(&self, company_id: Uuid, name: &str) -> Result<crate::module::recruiter::model::TalentPool, sqlx::Error> {
        sqlx::query_as::<_, crate::module::recruiter::model::TalentPool>(
            r#"
            INSERT INTO talent_pools (company_id, name)
            VALUES ($1, $2)
            RETURNING *
            "#
        )
        .bind(company_id)
        .bind(name)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn get_talent_pool(&self, pool_id: Uuid, company_id: Uuid) -> Result<Option<crate::module::recruiter::model::TalentPool>, sqlx::Error> {
        sqlx::query_as::<_, crate::module::recruiter::model::TalentPool>(
            r#"
            SELECT * FROM talent_pools WHERE id = $1 AND company_id = $2
            "#
        )
        .bind(pool_id)
        .bind(company_id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn list_talent_pools(&self, company_id: Uuid) -> Result<Vec<crate::module::recruiter::model::TalentPool>, sqlx::Error> {
        sqlx::query_as::<_, crate::module::recruiter::model::TalentPool>(
            r#"
            SELECT * FROM talent_pools WHERE company_id = $1 ORDER BY created_at DESC
            "#
        )
        .bind(company_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn add_resume_to_pool(&self, pool_id: Uuid, user_id: Uuid, resume_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO talent_pool_resumes (pool_id, user_id, resume_id)
            VALUES ($1, $2, $3)
            ON CONFLICT DO NOTHING
            "#
        )
        .bind(pool_id)
        .bind(user_id)
        .bind(resume_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn list_pool_candidates(&self, pool_id: Uuid) -> Result<Vec<crate::module::recruiter::model::PoolCandidateDetail>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT 
                u.id as user_id,
                r.id as resume_id,
                u.name as candidate_name,
                u.email as candidate_email,
                r.title as resume_title,
                r.file_name as resume_file_name
            FROM talent_pool_resumes tpr
            JOIN users u ON tpr.user_id = u.id
            JOIN resumes r ON tpr.resume_id = r.id
            WHERE tpr.pool_id = $1
            ORDER BY u.created_at DESC
            "#
        )
        .bind(pool_id)
        .fetch_all(&self.pool)
        .await?;

        let mut candidates = Vec::new();
        for row in rows {
            let candidate: crate::module::recruiter::model::PoolCandidateDetail = sqlx::FromRow::from_row(&row)?;
            candidates.push(candidate);
        }

        Ok(candidates)
    }

    pub async fn delete_talent_pool(&self, pool_id: Uuid, company_id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            DELETE FROM talent_pools 
            WHERE id = $1 AND company_id = $2
            "#
        )
        .bind(pool_id)
        .bind(company_id)
        .execute(&self.pool)
        .await?;
        
        Ok(result.rows_affected() > 0)
    }
}
