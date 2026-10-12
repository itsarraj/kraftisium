import { Link } from 'react-router-dom';
import StaticPageLayout from '../components/StaticPageLayout';
import { APP_NAME } from '../constants/brand';
import { SUPPORT_EMAIL } from '../constants/site';

export default function CookiesPage() {
  const updated = 'May 31, 2026';

  return (
    <StaticPageLayout
      title="Cookie policy"
      description={`How ${APP_NAME} uses cookies and similar technologies.`}
      maxWidth="lg">
      <h1 className="text-4xl font-bold text-center mb-2 text-[#fcc636]">Cookie policy</h1>
      <p className="text-center text-white/50 text-sm mb-10">Last updated: {updated}</p>

      <div className="space-y-6 text-white/85">
        <p>
          {APP_NAME} uses cookies and local storage to keep you signed in and remember preferences.
        </p>

        <section>
          <h2 className="text-xl font-bold text-[#fcc636]">Essential</h2>
          <p>
            Authentication tokens and session state are stored in your browser so you stay logged in between visits.
            These are required for the service to work.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#fcc636]">Functional</h2>
          <p>
            We may store UI preferences (for example dismissing promotional banners) in local storage. These are not
            used for third-party advertising.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#fcc636]">Managing cookies</h2>
          <p>
            You can clear cookies and site data in your browser settings. Clearing essential cookies will sign you out.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#fcc636]">More information</h2>
          <p>
            See our{' '}
            <Link to="/privacy" className="text-[#fcc636] hover:underline">
              privacy policy
            </Link>
            . Questions:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#fcc636] hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </StaticPageLayout>
  );
}
