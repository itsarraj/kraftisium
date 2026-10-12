//! Shared SQL for reading jobs with live company branding from `companies`.

pub const JOB_SELECT: &str = r#"
    j.id,
    j.company_id,
    COALESCE(c.name, j.company_name) AS company_name,
    COALESCE(c.logo_url, j.company_logo_url) AS company_logo_url,
    j.position_title,
    j.location,
    j.employment_type,
    j.salary_min,
    j.salary_max,
    j.salary_currency,
    j.salary_period,
    j.description,
    j.requirements,
    j.facilities,
    j.tags,
    j.status,
    j.featured,
    j.posted_at,
    j.created_at,
    j.updated_at
"#;

pub const JOB_FROM_JOIN: &str = "FROM jobs j LEFT JOIN companies c ON c.id = j.company_id";
