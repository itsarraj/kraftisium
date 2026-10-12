//! Cloudflare Turnstile verification (register/login CAPTCHA).
//! See `docs/turnstile.md` for setup and the mobile-app compatibility note.

use serde::Deserialize;

const SITEVERIFY_URL: &str = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

#[derive(Debug, Deserialize)]
struct SiteverifyResponse {
    success: bool,
    #[serde(default)]
    action: Option<String>,
    #[serde(default)]
    hostname: Option<String>,
}

fn response_ok(response: &SiteverifyResponse, expected_action: &str, expected_hostnames: &[String]) -> bool {
    let Some(hostname) = response.hostname.as_deref() else {
        return false;
    };
    response.success
        && response.action.as_deref() == Some(expected_action)
        && expected_hostnames.iter().any(|allowed| allowed == hostname)
}

pub async fn verify(
    http: &reqwest::Client,
    secret_key: &str,
    token: &str,
    remote_ip: Option<&str>,
    expected_action: &str,
    expected_hostnames: &[String],
) -> Result<bool, reqwest::Error> {
    if token.is_empty() || token.len() > 2048 || expected_hostnames.is_empty() {
        return Ok(false);
    }

    let mut params = vec![("secret", secret_key), ("response", token)];
    if let Some(ip) = remote_ip {
        params.push(("remoteip", ip));
    }

    let response = http
        .post(SITEVERIFY_URL)
        .timeout(std::time::Duration::from_secs(10))
        .form(&params)
        .send()
        .await?
        .json::<SiteverifyResponse>()
        .await?;

    Ok(response_ok(&response, expected_action, expected_hostnames))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn resp(success: bool, action: &str, hostname: &str) -> SiteverifyResponse {
        SiteverifyResponse {
            success,
            action: Some(action.to_string()),
            hostname: Some(hostname.to_string()),
        }
    }

    #[test]
    fn accepts_matching_action_and_hostname() {
        let allowed = vec!["localhost".to_string()];
        assert!(response_ok(&resp(true, "login", "localhost"), "login", &allowed));
    }

    #[test]
    fn rejects_wrong_action_hostname_or_failure() {
        let allowed = vec!["localhost".to_string()];
        assert!(!response_ok(&resp(false, "login", "localhost"), "login", &allowed));
        assert!(!response_ok(&resp(true, "signup", "localhost"), "login", &allowed));
        assert!(!response_ok(&resp(true, "login", "evil.example"), "login", &allowed));
        assert!(!response_ok(&resp(true, "login", "localhost"), "login", &[]));
    }
}
