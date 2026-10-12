use resend_rs::types::SendEmail;
use resend_rs::{Client, Result};
use std::sync::Arc;

/// Shown in the verification email when founding Premium slots are still available.
pub struct FoundingOfferTeaser {
    pub message: String,
    pub yearly_price_usd: u32,
    pub founding_years: i64,
}

#[derive(Clone)]
pub struct EmailService {
    client: Arc<Client>,
    from_email: String,
    from_name: String,
    /// Frontend URL for user-facing flows like email verification and password reset
    /// (e.g. http://localhost:5173).
    frontend_base_url: String,
}

impl EmailService {
    pub fn new(
        api_key: String,
        from_email: String,
        from_name: String,
        base_url: String,
        frontend_base_url: Option<String>,
    ) -> Self {
        let client = Client::new(&api_key);
        let frontend_base_url = frontend_base_url.unwrap_or_else(|| base_url.clone());
        Self {
            client: Arc::new(client),
            from_email,
            from_name,
            frontend_base_url,
        }
    }

    pub async fn send_verification_email(
        &self,
        to_email: &str,
        verification_token: &str,
        founding_offer: Option<&FoundingOfferTeaser>,
    ) -> Result<()> {
        let from = format!("{} <{}>", self.from_name, self.from_email);
        let to = [to_email];
        let subject = "Verify Your Email Address";

        // Use a frontend route so the browser lands on the Web UI first.
        // The frontend then POSTs the token to the backend for verification.
        let frontend_base_url = self.frontend_base_url.trim_end_matches('/');
        let verification_url = format!(
            "{}/verify-email?token={}",
            frontend_base_url, verification_token
        );
        let verify_page_url = format!("{}/verify-email", frontend_base_url);

        let founding_html = founding_offer
            .map(|offer| {
                format!(
                    r#"
                <div style="margin: 28px 0; padding: 16px 18px; background: #fff8e6; border: 1px solid #fcc636; border-radius: 8px;">
                    <p style="margin: 0 0 8px; color: #333; font-weight: bold; font-size: 16px;">
                        Welcome, founding member — your Premium gift awaits
                    </p>
                    <p style="margin: 0; color: #555; line-height: 1.6; font-size: 14px;">
                        {message} After you verify, we'll activate <strong>Yearly Premium</strong> on your account
                        at no charge for {years} year(s) (${price}/year value): unlimited AI job matches and full Premium features.
                    </p>
                </div>
                "#
                    ,
                    message = offer.message,
                    years = offer.founding_years,
                    price = offer.yearly_price_usd
                )
            })
            .unwrap_or_default();

        let founding_text = founding_offer
            .map(|offer| {
                format!(
                    "\nLaunch offer: {}\nAfter you verify, Yearly Premium is free for {} year(s) (${}/year value).\n",
                    offer.message, offer.founding_years, offer.yearly_price_usd
                )
            })
            .unwrap_or_default();

        let app_name = &self.from_name;
        let html = format!(
            r#"
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Verify Your Email</title>
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #333; text-align: center;">Verify Your Email Address</h1>
                <p style="color: #666; line-height: 1.6;">
                    Welcome! Please click the button below to verify your email address and complete your registration.
                    The link opens {app_name} in your browser, shows a confirmation screen, and securely finishes verification there.
                </p>
                {founding_html}
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_url}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Verify Email
                    </a>
                </div>
                <p style="color: #999; font-size: 14px;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="{verification_url}">{verification_url}</a>
                </p>
                <p style="color: #666; line-height: 1.6; margin-top: 24px;">
                    Or open <a href="{verify_page_url}">{verify_page_url}</a> and paste this verification code:
                </p>
                <p style="background: #f4f4f4; border: 1px solid #ddd; border-radius: 6px; padding: 12px 16px; font-family: monospace; font-size: 15px; letter-spacing: 0.5px; word-break: break-all; color: #222;">
                    {verification_token}
                </p>
                <p style="color: #999; font-size: 12px;">
                    This link and code will expire in 24 hours.
                </p>
            </body>
            </html>
            "#,
            app_name = app_name,
            founding_html = founding_html,
            verification_url = verification_url,
            verify_page_url = verify_page_url,
            verification_token = verification_token,
        );

        let text = format!(
            "Verify Your Email Address\n\n\
             Welcome! Click this link to verify your account:\n\
             {verification_url}\n\
             {founding_text}\n\
             If the link does not work, open this page in your browser:\n\
             {verify_page_url}\n\n\
             Then paste this verification code:\n\
             {verification_token}\n\n\
             This link and code expire in 24 hours.",
            verification_url = verification_url,
            founding_text = founding_text,
            verify_page_url = verify_page_url,
            verification_token = verification_token,
        );

        let email = SendEmail::new(from, to, subject)
            .with_html(&html)
            .with_text(&text);

        self.client.emails.send(email).await?;
        Ok(())
    }

    pub async fn send_password_reset_email(&self, to_email: &str, reset_token: &str) -> Result<()> {
        let from = format!("{} <{}>", self.from_name, self.from_email);
        let to = [to_email];
        let subject = "Reset Your Password";

        let reset_url = format!(
            "{}/reset-password?token={}",
            self.frontend_base_url, reset_token
        );

        let html = format!(
            r#"
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Reset Your Password</title>
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #333; text-align: center;">Reset Your Password</h1>
                <p style="color: #666; line-height: 1.6;">
                    We received a request to reset your password. Click the button below to create a new password.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #666; line-height: 1.6;">
                    If you didn't request this password reset, you can safely ignore this email.
                </p>
                <p style="color: #999; font-size: 14px;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="{}">{}</a>
                </p>
                <p style="color: #999; font-size: 12px;">
                    This link will expire in 1 hour.
                </p>
            </body>
            </html>
            "#,
            reset_url, reset_url, reset_url
        );

        let email = SendEmail::new(from, to, subject).with_html(&html);

        self.client.emails.send(email).await?;
        Ok(())
    }

    pub async fn send_founding_premium_email(
        &self,
        to_email: &str,
        name: &str,
        founding_slot: i32,
        premium_until: chrono::DateTime<chrono::Utc>,
        yearly_price_usd: u32,
    ) -> Result<()> {
        let from = format!("{} <{}>", self.from_name, self.from_email);
        let to = [to_email];
        let subject = "You're in — 1 year of Premium, on us";
        let until = premium_until.format("%B %d, %Y").to_string();
        let display_name = if name.trim().is_empty() {
            "there"
        } else {
            name.trim()
        };

        let app_name = &self.from_name;
        let html = format!(
            r#"
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"><title>Yearly Premium</title></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #333; text-align: center;">Welcome, founding member!</h1>
                <p style="color: #666; line-height: 1.6;">Hi {display_name},</p>
                <p style="color: #666; line-height: 1.6;">
                    You're member <strong>#{founding_slot}</strong> in our launch cohort.
                    We've activated <strong>Yearly Premium</strong> on your account at no charge
                    until <strong>{until}</strong> (a ${yearly_price_usd}/year value).
                </p>
                <p style="color: #666; line-height: 1.6;">
                    Enjoy unlimited AI job matches, full recruiter tools, and more while your Premium is active.
                </p>
                <p style="color: #999; font-size: 12px;">Thank you for joining {app_name} early.</p>
            </body>
            </html>
            "#,
            display_name = display_name,
            founding_slot = founding_slot,
            until = until,
            yearly_price_usd = yearly_price_usd,
            app_name = app_name,
        );

        let text = format!(
            "Welcome, founding member!\n\n\
             Hi {display_name},\n\n\
             You're member #{founding_slot} in our launch cohort. We've activated Yearly Premium on your account at no charge until {until} (a ${yearly_price_usd}/year value).\n\n\
             Enjoy unlimited AI job matches, full recruiter tools, and more while your Premium is active.\n\n\
             Thank you for joining {app_name} early.",
            display_name = display_name,
            founding_slot = founding_slot,
            until = until,
            yearly_price_usd = yearly_price_usd,
            app_name = app_name,
        );

        let email = SendEmail::new(from, to, subject)
            .with_html(&html)
            .with_text(&text);
        self.client.emails.send(email).await?;
        Ok(())
    }

    pub async fn send_new_application_email(
        &self,
        to_email: &str,
        job_title: &str,
        candidate_name: &str,
        company_name: &str,
    ) -> Result<()> {
        let from = format!("{} <{}>", self.from_name, self.from_email);
        let to = [to_email];
        let subject = format!("New application: {} — {}", candidate_name, job_title);
        let dashboard_url = format!(
            "{}/recruiter",
            self.frontend_base_url.trim_end_matches('/')
        );

        let html = format!(
            r#"<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
            <h2 style="color: #2b2b2b;">New job application</h2>
            <p><strong>{candidate_name}</strong> applied for <strong>{job_title}</strong> at {company_name}.</p>
            <p style="margin: 24px 0;">
              <a href="{dashboard_url}" style="background: #fcc636; color: #2b2b2b; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Review in dashboard
              </a>
            </p>
            </div>"#
        );

        let text = format!(
            "New application\n\n{candidate_name} applied for {job_title} at {company_name}.\n\nReview: {dashboard_url}"
        );

        let email = SendEmail::new(from, to, &subject)
            .with_html(&html)
            .with_text(&text);
        self.client.emails.send(email).await?;
        Ok(())
    }

    pub async fn send_application_status_email(
        &self,
        to_email: &str,
        candidate_name: &str,
        job_title: &str,
        company_name: &str,
        status: &str,
    ) -> Result<()> {
        let from = format!("{} <{}>", self.from_name, self.from_email);
        let to = [to_email];
        let (headline, detail) = match status {
            "shortlisted" => (
                "You've been shortlisted",
                "The recruiter is taking a closer look at your application.",
            ),
            "interview" => (
                "You've been invited to interview",
                "The recruiter wants to move forward — expect them to reach out with next steps.",
            ),
            "hired" => (
                "Congratulations — you got the job!",
                "The recruiter has marked you as hired for this role.",
            ),
            "rejected" => (
                "Update on your application",
                "The recruiter has decided not to move forward with your application this time.",
            ),
            other => (
                "Your application status changed",
                other,
            ),
        };
        let subject = format!("{} — {}", headline, job_title);
        let applications_url = format!(
            "{}/profile?tab=applications",
            self.frontend_base_url.trim_end_matches('/')
        );
        let display_name = if candidate_name.trim().is_empty() {
            "there"
        } else {
            candidate_name.trim()
        };

        let html = format!(
            r#"<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
            <h2 style="color: #2b2b2b;">{headline}</h2>
            <p>Hi {display_name},</p>
            <p>Your application for <strong>{job_title}</strong> at <strong>{company_name}</strong>: {detail}</p>
            <p style="margin: 24px 0;">
              <a href="{applications_url}" style="background: #fcc636; color: #2b2b2b; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                View your applications
              </a>
            </p>
            </div>"#
        );

        let text = format!(
            "{headline}\n\nHi {display_name},\n\nYour application for {job_title} at {company_name}: {detail}\n\nView your applications: {applications_url}"
        );

        let email = SendEmail::new(from, to, &subject)
            .with_html(&html)
            .with_text(&text);
        self.client.emails.send(email).await?;
        Ok(())
    }

    pub async fn send_recruiter_intro_email(
        &self,
        to_email: &str,
        candidate_name: &str,
        recruiter_name: &str,
        company_name: &str,
        job_title: &str,
        note: Option<&str>,
    ) -> Result<()> {
        let from = format!("{} <{}>", self.from_name, self.from_email);
        let to = [to_email];
        let subject = format!("{} at {} would like to connect", recruiter_name, company_name);
        let job_url = format!("{}/jobs", self.frontend_base_url.trim_end_matches('/'));
        let display_name = if candidate_name.trim().is_empty() {
            "there"
        } else {
            candidate_name.trim()
        };
        let note_html = note
            .filter(|n| !n.trim().is_empty())
            .map(|n| format!(r#"<p style="background: #f7f7f7; border-radius: 8px; padding: 12px 16px;">{}</p>"#, html_escape::encode_text(n.trim())))
            .unwrap_or_default();
        let note_text = note
            .filter(|n| !n.trim().is_empty())
            .map(|n| format!("\n\"{}\"\n", n.trim()))
            .unwrap_or_default();

        let html = format!(
            r#"<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
            <h2 style="color: #2b2b2b;">A recruiter wants to connect</h2>
            <p>Hi {display_name},</p>
            <p><strong>{recruiter_name}</strong> from <strong>{company_name}</strong> saw your profile as a strong match for <strong>{job_title}</strong> and would like to hear from you.</p>
            {note_html}
            <p style="margin: 24px 0;">
              <a href="{job_url}" style="background: #fcc636; color: #2b2b2b; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                View the role
              </a>
            </p>
            <p style="color: #999; font-size: 12px;">Reply to this email to respond directly to the recruiter.</p>
            </div>"#
        );

        let text = format!(
            "A recruiter wants to connect\n\nHi {display_name},\n\n{recruiter_name} from {company_name} saw your profile as a strong match for {job_title} and would like to hear from you.\n{note_text}\nView the role: {job_url}\n\nReply to this email to respond directly to the recruiter."
        );

        let email = SendEmail::new(from, to, &subject)
            .with_html(&html)
            .with_text(&text);
        self.client.emails.send(email).await?;
        Ok(())
    }

    pub async fn send_job_digest_email(
        &self,
        to_email: &str,
        name: &str,
        matches: &[(String, String)], // (position_title, company_name)
    ) -> Result<()> {
        let from = format!("{} <{}>", self.from_name, self.from_email);
        let to = [to_email];
        let subject = if matches.len() == 1 {
            "1 new job matched your profile".to_string()
        } else {
            format!("{} new jobs matched your profile", matches.len())
        };
        let jobs_url = format!("{}/jobs", self.frontend_base_url.trim_end_matches('/'));
        let display_name = if name.trim().is_empty() { "there" } else { name.trim() };

        let list_html: String = matches
            .iter()
            .map(|(title, company)| {
                format!(
                    r#"<li style="margin-bottom: 8px;"><strong>{title}</strong> — {company}</li>"#
                )
            })
            .collect();
        let list_text: String = matches
            .iter()
            .map(|(title, company)| format!("- {title} — {company}\n"))
            .collect();

        let html = format!(
            r#"<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
            <h2 style="color: #2b2b2b;">{subject}</h2>
            <p>Hi {display_name},</p>
            <p>Since your last visit, these new jobs matched your profile:</p>
            <ul style="padding-left: 20px;">{list_html}</ul>
            <p style="margin: 24px 0;">
              <a href="{jobs_url}" style="background: #fcc636; color: #2b2b2b; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                See all matches
              </a>
            </p>
            </div>"#
        );

        let text = format!(
            "{subject}\n\nHi {display_name},\n\nSince your last visit, these new jobs matched your profile:\n\n{list_text}\nSee all matches: {jobs_url}"
        );

        let email = SendEmail::new(from, to, &subject)
            .with_html(&html)
            .with_text(&text);
        self.client.emails.send(email).await?;
        Ok(())
    }

    pub async fn send_payment_receipt_email(
        &self,
        to_email: &str,
        name: &str,
        plan_name: &str,
        amount_paid_display: &str,
        period_end: chrono::DateTime<chrono::Utc>,
    ) -> Result<()> {
        let from = format!("{} <{}>", self.from_name, self.from_email);
        let to = [to_email];
        let subject = "Payment received — receipt";
        let display_name = if name.trim().is_empty() { "there" } else { name.trim() };
        let renews = period_end.format("%B %d, %Y").to_string();
        let app_name = &self.from_name;

        let html = format!(
            r#"<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
            <h2 style="color: #2b2b2b;">Payment received</h2>
            <p>Hi {display_name},</p>
            <p>Thanks for subscribing to <strong>{plan_name}</strong> on {app_name}.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px 0; color: #666;">Plan</td><td style="padding: 8px 0; text-align: right;">{plan_name}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Amount paid</td><td style="padding: 8px 0; text-align: right;">{amount_paid_display}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Renews / valid until</td><td style="padding: 8px 0; text-align: right;">{renews}</td></tr>
            </table>
            <p style="color: #999; font-size: 12px;">Keep this email as your receipt.</p>
            </div>"#
        );

        let text = format!(
            "Payment received\n\nHi {display_name},\n\nThanks for subscribing to {plan_name} on {app_name}.\n\nPlan: {plan_name}\nAmount paid: {amount_paid_display}\nRenews / valid until: {renews}\n\nKeep this email as your receipt."
        );

        let email = SendEmail::new(from, to, subject)
            .with_html(&html)
            .with_text(&text);
        self.client.emails.send(email).await?;
        Ok(())
    }
}
