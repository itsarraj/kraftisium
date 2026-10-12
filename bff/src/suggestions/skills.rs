//! Resume keyword extraction for the Postgres full-text prefilter (mirrors ai-tests/resume_job_matcher/skills.py).

use std::collections::HashSet;

const SKILL_TERMS: &[&str] = &[
    "python", "java", "javascript", "typescript", "rust", "go", "golang", "kotlin", "swift", "ruby",
    "php", "react", "vue", "angular", "node", "nodejs", "django", "flask", "fastapi", "spring",
    "aws", "azure", "gcp", "kubernetes", "docker", "terraform", "linux", "sql", "postgres",
    "postgresql", "mysql", "mongodb", "redis", "kafka", "spark", "pytorch", "tensorflow", "devops",
    "git", "android", "ios", "backend", "frontend", "fullstack", "graphql", "rest", "api",
    "microservices", "security", "qa", "selenium", "product", "remote", "hybrid", "engineer",
    "developer", "architect", "senior", "lead", "data", "analytics", "machine", "learning",
];

const STOPWORDS: &[&str] = &[
    "the", "and", "for", "with", "from", "this", "that", "have", "has", "was", "were", "are",
    "been", "your", "you", "our", "their", "about", "into", "over", "under", "also", "more",
    "most", "other", "some", "than", "then", "them", "they", "what", "when", "where", "which",
    "while", "who", "how", "all", "any", "each", "few", "many", "much", "own", "same", "too",
    "very", "can", "could", "should", "would", "may", "might", "must", "using", "used", "use",
    "work", "worked", "working", "experience", "years", "year", "month", "months", "company",
    "team", "role", "skills", "skill", "resume",
];

pub fn resume_plain_text(title: Option<&str>, content: Option<&serde_json::Value>) -> String {
    let mut parts = Vec::new();
    if let Some(t) = title {
        let t = t.trim();
        if !t.is_empty() {
            parts.push(t.to_string());
        }
    }
    if let Some(c) = content {
        let s = match c {
            serde_json::Value::String(s) => s.clone(),
            _ => c.to_string(),
        };
        let s = s.trim();
        if !s.is_empty() {
            parts.push(s.to_string());
        }
    }
    parts.join("\n")
}

pub fn build_search_query(text: &str) -> String {
    let lowered = text.to_lowercase();
    let mut found = Vec::new();
    let mut seen = HashSet::new();

    for token in tokenize(&lowered) {
        if SKILL_TERMS.contains(&token.as_str()) && seen.insert(token.clone()) {
            found.push(token);
        }
        if found.len() >= 24 {
            break;
        }
    }

    if found.is_empty() {
        let mut long_words: Vec<String> = tokenize(&lowered)
            .into_iter()
            .filter(|w| w.len() >= 4 && !STOPWORDS.contains(&w.as_str()))
            .collect();
        long_words.sort_by_key(|w| std::cmp::Reverse(w.len()));
        long_words.truncate(12);
        found = long_words;
    }

    if found.is_empty() {
        return String::new();
    }

    found
        .iter()
        .map(|t| {
            if t.contains(' ') {
                format!("\"{t}\"")
            } else {
                t.clone()
            }
        })
        .collect::<Vec<_>>()
        .join(" OR ")
}

/// Lightweight overlap score (0–1) when embedding matcher is unavailable.
pub fn keyword_match_score(resume_text: &str, job_text: &str) -> f64 {
    let resume_skills = skill_token_set(resume_text);
    let job_skills = skill_token_set(job_text);

    if !job_skills.is_empty() {
        let overlap = resume_skills.intersection(&job_skills).count();
        return (overlap as f64 / job_skills.len() as f64).clamp(0.05, 0.85);
    }

    let resume_tokens = content_token_set(resume_text);
    let job_tokens = content_token_set(job_text);
    if job_tokens.is_empty() {
        return 0.0;
    }
    let overlap = resume_tokens.intersection(&job_tokens).count();
    (overlap as f64 / job_tokens.len() as f64).clamp(0.05, 0.75)
}

fn skill_token_set(text: &str) -> HashSet<String> {
    tokenize(&text.to_lowercase())
        .into_iter()
        .filter(|t| SKILL_TERMS.contains(&t.as_str()))
        .collect()
}

fn content_token_set(text: &str) -> HashSet<String> {
    tokenize(&text.to_lowercase())
        .into_iter()
        .filter(|t| t.len() >= 4 && !STOPWORDS.contains(&t.as_str()))
        .collect()
}

fn tokenize(lowered: &str) -> Vec<String> {
    lowered
        .split(|c: char| !c.is_alphanumeric() && c != '+' && c != '#' && c != '.' && c != '/')
        .map(str::trim)
        .filter(|s| s.len() >= 2)
        .map(|s| s.trim_matches(|c: char| c.is_ascii_punctuation()).to_string())
        .filter(|s| !s.is_empty())
        .collect()
}
