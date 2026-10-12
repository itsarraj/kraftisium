use actix_web::web;

use crate::module::applications::handler as applications_handler;
use crate::module::auth::handler::*;
use crate::module::health::handler::health_status;
use crate::module::profiles::handler as profiles_handler;
use crate::module::recruiter::handler as recruiter_handler;
use crate::module::resume::handler as resume_handler;
use crate::module::resumes::handler as resumes_handler;
use crate::module::saved_jobs::handler as saved_jobs_handler;
use crate::module::stats::handler as stats_handler;
use crate::module::payments::handler as payments_handler;
use crate::module::subscription::handler as subscription_handler;

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1")
            .route("/health", web::get().to(health_status))
            .route("/stats", web::get().to(stats_handler::get_stats))
            .route(
                "/subscription/promo",
                web::get().to(subscription_handler::get_promo_banner),
            )
            .route(
                "/subscription/promo/validate",
                web::get().to(subscription_handler::get_promo_validate),
            )
            .route(
                "/subscription/referral-settings",
                web::get().to(subscription_handler::get_referral_settings),
            )
            .service(
                web::scope("/subscription")
                    .route("/checkout", web::get().to(subscription_handler::get_checkout_status))
                    .route("/checkout", web::post().to(subscription_handler::post_checkout))
                    .route("/redeem-credits", web::post().to(subscription_handler::post_redeem_credits)),
            )
            .service(
                web::scope("/payments")
                    .route("/create-order", web::post().to(payments_handler::create_order))
                    .route("/verify-payment", web::post().to(payments_handler::verify_payment))
                    .route("/webhook", web::post().to(payments_handler::razorpay_webhook)),
            )
            .service(
                web::scope("/auth")
                    .route("/register", web::post().to(register))
                    .route("/login", web::post().to(login))
                    .route("/refresh", web::post().to(refresh_token))
                    .route("/logout", web::post().to(logout))
                    .route("/verify-email", web::post().to(verify_email_from_request))
                    .route("/verify-email/{token}", web::get().to(verify_email))
                    .route("/password-reset", web::post().to(request_password_reset))
                    .route("/password-reset/confirm", web::post().to(reset_password))
                    .route("/google", web::get().to(google_auth_start))
                    .route("/google/callback", web::get().to(google_auth_callback))
                    .route("/google", web::post().to(google_auth_token)),
            )
            .service(
                web::scope("/user")
                    .route("/profile", web::get().to(get_profile))
                    .route("/profile", web::put().to(update_profile))
                    .route("/change-password", web::post().to(change_password))
                    .route("/account", web::delete().to(delete_account)),
            )
            .service(
                web::scope("/admin")
                    .route("/users", web::get().to(admin_get_users))
                    .route("/overview", web::get().to(admin_get_overview)),
            )
            .service(web::scope("/jobs").configure(|job_cfg| {
                job_cfg.route("", web::get().to(resume_handler::list_jobs));
                job_cfg.route("/search", web::get().to(resume_handler::search_jobs));
                job_cfg.route(
                    "/suggested/{user_id}/refresh",
                    web::post().to(resume_handler::post_refresh_suggested_jobs),
                );
                job_cfg.route(
                    "/suggested/{user_id}",
                    web::get().to(resume_handler::get_suggested_jobs),
                );
                job_cfg.route("/{id}", web::get().to(resume_handler::get_job));
            }))
            .service(
                web::scope("/saved-jobs")
                    .route("", web::get().to(saved_jobs_handler::list_saved_jobs))
                    .route("/{job_id}", web::post().to(saved_jobs_handler::save_job))
                    .route("/{job_id}", web::delete().to(saved_jobs_handler::unsave_job)),
            )
            .service(
                web::scope("/resumes")
                    .route("", web::get().to(resumes_handler::list_resumes))
                    .route("", web::post().to(resumes_handler::create_resume))
                    .route(
                        "/upload",
                        web::post().to(resumes_handler::create_resume_upload),
                    )
                    .route("/{id}", web::get().to(resumes_handler::get_resume))
                    .route("/{id}", web::put().to(resumes_handler::update_resume))
                    .route("/{id}", web::delete().to(resumes_handler::delete_resume)),
            )
            .service(
                web::scope("/applications")
                    .route(
                        "",
                        web::get().to(applications_handler::list_my_applications),
                    )
                    .route("", web::post().to(applications_handler::create_application))
                    .route(
                        "/job/{job_id}",
                        web::get().to(applications_handler::list_job_applications),
                    )
                    .route(
                        "/job/{job_id}/detailed",
                        web::get().to(applications_handler::list_job_applications_detailed),
                    )
                    .route(
                        "/{id}",
                        web::put().to(applications_handler::update_application),
                    )
                    .route(
                        "/{id}/resume",
                        web::get().to(applications_handler::download_application_resume),
                    ),
            )
            .service(web::scope("/recruiter").configure(|rec_cfg| {
                rec_cfg.route(
                    "/my-companies",
                    web::get().to(recruiter_handler::list_my_companies),
                );
                rec_cfg.route(
                    "/companies",
                    web::post().to(recruiter_handler::create_company),
                );
                rec_cfg.route(
                    "/companies/{id}",
                    web::get().to(recruiter_handler::get_company),
                );
                rec_cfg.route(
                    "/companies/{id}",
                    web::patch().to(recruiter_handler::update_company),
                );
                rec_cfg.route("/limits", web::get().to(recruiter_handler::get_recruiter_limits));
                rec_cfg.route("/jobs", web::get().to(recruiter_handler::list_jobs));
                rec_cfg.route("/jobs", web::post().to(recruiter_handler::create_job));
                rec_cfg.route(
                    "/jobs/{id}",
                    web::patch().to(recruiter_handler::update_job),
                );
                rec_cfg.route(
                    "/jobs/{id}/suggested-candidates",
                    web::get().to(recruiter_handler::suggested_candidates),
                );
                rec_cfg.route(
                    "/jobs/{id}/suggested-candidates/{user_id}/request-intro",
                    web::post().to(recruiter_handler::request_intro),
                );
                rec_cfg.route(
                    "/jobs/{id}/duplicate",
                    web::post().to(recruiter_handler::duplicate_job),
                );
                rec_cfg.route(
                    "/jobs/{id}/bulk-resume",
                    web::post().to(recruiter_handler::upload_bulk_resume),
                );
                rec_cfg.route(
                    "/quick-match",
                    web::post().to(recruiter_handler::quick_match_resumes),
                );
                rec_cfg.route(
                    "/overview",
                    web::get().to(applications_handler::get_recruiter_overview),
                );
                rec_cfg.route(
                    "/inbox",
                    web::get().to(applications_handler::get_recruiter_inbox),
                );
                rec_cfg.route(
                    "/job-stats",
                    web::get().to(applications_handler::get_job_application_counts),
                );
                rec_cfg.route("/talent-pools", web::post().to(recruiter_handler::create_talent_pool));
                rec_cfg.route("/talent-pools", web::get().to(recruiter_handler::list_talent_pools));
                rec_cfg.route("/talent-pools/{id}", web::get().to(recruiter_handler::get_talent_pool));
                rec_cfg.route("/talent-pools/{id}", web::delete().to(recruiter_handler::delete_talent_pool));
                rec_cfg.route("/talent-pools/{id}/upload", web::post().to(recruiter_handler::upload_talent_pool_resume));
                rec_cfg.route("/talent-pools/{id}/candidates", web::get().to(recruiter_handler::list_pool_candidates));
                rec_cfg.route("/talent-pools/score-custom", web::post().to(recruiter_handler::score_pool_candidates_custom));
            }))
            .service(
                web::scope("/employer-profiles")
                    .route(
                        "",
                        web::post().to(profiles_handler::create_or_update_employer_profile),
                    )
                    .route("/me/company", web::get().to(profiles_handler::get_employer_company))
                    .route("/me", web::get().to(profiles_handler::get_employer_profile)),
            )
            .service(
                web::scope("/candidate-profiles")
                    .route(
                        "",
                        web::post().to(profiles_handler::create_or_update_candidate_profile),
                    )
                    .route(
                        "/me",
                        web::get().to(profiles_handler::get_candidate_profile),
                    ),
            ),
    );
}
