import StaticPageLayout from '../components/StaticPageLayout';
import { APP_NAME } from '../constants/brand';
import { SUPPORT_EMAIL } from '../constants/site';

export default function DeleteAccountPage() {
  return (
    <StaticPageLayout
      title="Delete your account"
      description={`How to request deletion of your ${APP_NAME} account and what happens to your data.`}
      maxWidth="lg">
      <h1 className="text-4xl font-bold text-center mb-2 text-[#fcc636]">Delete your account</h1>
      <p className="text-center text-white/50 text-sm mb-10">
        Applies to the {APP_NAME} web app and mobile app (candidate and recruiter accounts).
      </p>

      <div className="space-y-6 text-white/85">
        <section>
          <h2 className="text-xl font-bold text-[#fcc636]">Option 1: In the app (immediate)</h2>
          <ol className="list-decimal list-inside space-y-2 mt-2">
            <li>Log in to {APP_NAME} (web or mobile).</li>
            <li>Go to <strong>Settings</strong> (candidate accounts) or your <strong>Profile</strong> menu.</li>
            <li>Select <strong>Delete Account</strong>, type DELETE to confirm, and submit.</li>
          </ol>
          <p className="mt-2 text-white/60 text-sm">
            Your login is disabled immediately — you're signed out and can no longer sign back in with that email or
            Google account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#fcc636]">Option 2: Can't log in?</h2>
          <p>
            Email{' '}
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Delete my account`} className="text-[#fcc636] hover:underline">
              {SUPPORT_EMAIL}
            </a>{' '}
            from the address on your account and ask us to delete it. We verify the request and process it within 7
            business days.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#fcc636]">What gets deleted, and when</h2>
          <p>Deleting your account:</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>Immediately disables sign-in — your password and Google sign-in link are removed and you're signed out everywhere.</li>
            <li>Immediately removes your email address and name from active use; the email is freed up if you ever want to sign up again.</li>
            <li>Permanently and irreversibly deletes your profile, resumes, applications, and other account data within 90 days.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#fcc636]">Delete specific data without deleting your account</h2>
          <p>
            You don't have to delete your whole account to remove something. Email{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#fcc636] hover:underline">
              {SUPPORT_EMAIL}
            </a>{' '}
            to request deletion of a specific resume, application, or other piece of your data, and we'll remove
            just that.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#fcc636]">Data & account security</h2>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>Data collected: account details (name, email), resumes and profile content, job applications, and basic technical/usage logs.</li>
            <li>All data is encrypted in transit (HTTPS/TLS).</li>
            <li>Accounts can be created with email + password, or with Google sign-in (OAuth).</li>
          </ul>
          <p className="mt-2">
            See our{' '}
            <a href="/privacy" className="text-[#fcc636] hover:underline">
              Privacy policy
            </a>{' '}
            for full details.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#fcc636]">Questions</h2>
          <p>
            Contact{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#fcc636] hover:underline">
              {SUPPORT_EMAIL}
            </a>{' '}
            for anything about your account or data.
          </p>
        </section>
      </div>
    </StaticPageLayout>
  );
}
