use actix_cors::Cors;
use actix_web::http::header;

fn origin_allowed(origin: &str, frontend_base_url: &str) -> bool {
    if matches!(
        origin,
        "http://localhost:5173"
            | "http://127.0.0.1:5173"
            | "http://localhost"
            | "http://127.0.0.1"
    ) {
        return true;
    }

    let frontend = frontend_base_url.trim_end_matches('/');
    if frontend.is_empty() {
        return false;
    }

    if origin == frontend {
        return true;
    }

    // Allow www variant when apex is configured (e.g. https://kraftisium.xyz).
    if let Some(rest) = frontend.strip_prefix("https://") {
        if !rest.starts_with("www.") {
            let www = format!("https://www.{rest}");
            if origin == www {
                return true;
            }
        }
    }

    false
}

pub fn configure_cors(frontend_base_url: String) -> Cors {
    Cors::default()
        .allowed_origin_fn(move |origin, _req_head| {
            let Ok(origin) = origin.to_str() else {
                return false;
            };
            origin_allowed(origin, &frontend_base_url)
        })
        .allow_any_method()
        .allowed_headers(vec![
            header::AUTHORIZATION,
            header::ACCEPT,
            header::CONTENT_TYPE,
            header::HeaderName::from_static("x-user-id"),
        ])
        .supports_credentials()
        .max_age(3600)
}
