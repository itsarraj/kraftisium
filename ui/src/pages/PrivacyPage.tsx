import { Link } from 'react-router-dom';
import StaticPageLayout from '../components/StaticPageLayout';
import { APP_NAME } from '../constants/brand';
import { SUPPORT_EMAIL, SITE_URL } from '../constants/site';

export default function PrivacyPage() {
  const updated = 'May 31, 2026';

  return (
    <StaticPageLayout
      title="Privacy policy"
      description={`How ${APP_NAME} collects, uses, and protects your data.`}
      maxWidth="lg">
      <h1 className="text-4xl font-bold text-center mb-2 text-[#fcc636]">Privacy policy</h1>
      <p className="text-center text-white/50 text-sm mb-10">Last updated: {updated}</p>

      <div className="space-y-6 text-white/85">
        <p>
          {APP_NAME} ({SITE_URL}) respects your privacy. This policy describes what we collect and why.
        </p>

        <section>
          <h2 className="text-xl font-bold text-[#fcc636]">Information we collect</h2>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>Account data: name, email, role (candidate or recruiter)</li>
            <li>Resume files and profile text you provide</li>
            <li>Job applications, saved jobs, and recruiter postings</li>
            <li>Technical logs: IP address, browser type, and usage for security and reliability</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#fcc636]">How we use it</h2>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>Authenticate you and operate the platform</li>
            <li>Match resumes to jobs using automated processing</li>
            <li>Send transactional email (verification, password reset, notifications)</li>
            <li>Improve reliability and prevent abuse</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#fcc636]">Sharing</h2>
          <p>
            Recruiters see application materials you submit to their jobs. We use service providers (e.g. email
            delivery, hosting) under appropriate agreements. We do not sell personal data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#fcc636]">Retention & security</h2>
          <p>
            Data is stored while your account is active and as needed for legal or operational purposes. We use
            industry-standard measures; no system is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#fcc636]">Your choices</h2>
          <p>
            You may update profile data, request account deletion via contact, and control cookies per our{' '}
            <Link to="/cookies" className="text-[#fcc636] hover:underline">
              cookie policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#fcc636]">Contact</h2>
          <p>
            Privacy requests:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#fcc636] hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </StaticPageLayout>
  );
}
