import StaticPageLayout from '../components/StaticPageLayout';
import { APP_NAME, BRAND_MARK_ASPECT, BRAND_MARK_PATH } from '../constants/brand';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=xyz.kraftisium.jobs';
const APK_URL = '/downloads/kraftisium.apk';

const DownloadPage = () => {
  return (
    <StaticPageLayout
      title="Download the app"
      description={`Get the ${APP_NAME} Android app — direct APK download or Google Play.`}
      maxWidth="md">
      <div className="flex flex-col items-center mb-10">
        <img src={BRAND_MARK_PATH} alt="" height={56} width={Math.round(56 * BRAND_MARK_ASPECT)} className="mb-4 object-contain" />
        <h1 className="text-4xl font-bold text-center text-[#fcc636]">Get the {APP_NAME} app</h1>
        <p className="mt-3 text-center text-white/60">Android. Choose whichever install method works for you.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-3 rounded-xl bg-[#1a1a1a] border border-white/10 p-8 text-center transition-all hover:border-[#fcc636]/40"
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-[#fcc636]">
            <path d="M3 3.5L14.5 12L3 20.5V3.5Z" fill="currentColor" />
            <path d="M14.5 12L18 9.8L20.5 11.3C21.2 11.7 21.2 12.3 20.5 12.7L18 14.2L14.5 12Z" fill="currentColor" fillOpacity="0.7" />
          </svg>
          <div>
            <p className="text-lg font-bold text-white">Get it on Google Play</p>
            <p className="mt-1 text-sm text-white/50">Recommended — automatic updates, verified by Google.</p>
          </div>
        </a>

        <a
          href={APK_URL}
          download
          className="flex flex-col items-center gap-3 rounded-xl bg-[#1a1a1a] border border-white/10 p-8 text-center transition-all hover:border-[#fcc636]/40"
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#fcc636]">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <div>
            <p className="text-lg font-bold text-white">Download APK directly</p>
            <p className="mt-1 text-sm text-white/50">Sideload the installer — no Play Store account needed.</p>
          </div>
        </a>
      </div>

      <div className="mt-8 rounded-xl bg-[#1a1a1a] border border-white/10 p-6 text-sm text-white/60 leading-relaxed">
        <p className="font-bold text-white/80 mb-2">Installing the direct APK</p>
        <p>
          Android blocks installs from outside the Play Store by default. When prompted, allow your browser to
          &ldquo;install unknown apps&rdquo; for this download — Settings → Apps → (your browser) → Install unknown apps.
        </p>
      </div>
    </StaticPageLayout>
  );
};

export default DownloadPage;
