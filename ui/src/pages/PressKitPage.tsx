import { Link } from 'react-router-dom';
import StaticPageLayout from '../components/StaticPageLayout';
import { APP_NAME, APP_TAGLINE, BRAND_MARK_PATH, LOGO_PATH, brandColors } from '../constants/brand';
import { founder, SITE_URL, SUPPORT_EMAIL } from '../constants/site';

export default function PressKitPage() {
  return (
    <StaticPageLayout
      title="Press kit"
      description={`Brand assets and facts about ${APP_NAME} for media and partners.`}>
      <h1 className="text-4xl font-bold text-center mb-8 text-[#fcc636]">Press kit</h1>

      <div className="space-y-8">
        <section className="rounded-xl bg-[#1a1a1a] border border-white/10 p-8">
          <h2 className="text-xl font-bold text-[#fcc636] mb-4">Brand</h2>
          <div className="flex items-center gap-4 mb-6">
            <img src={LOGO_PATH} alt="" width={64} height={64} className="object-contain" />
            <div>
              <p className="text-2xl font-bold">{APP_NAME}</p>
              <p className="text-white/70">{APP_TAGLINE}</p>
              <p className="text-sm text-white/50 mt-1">{SITE_URL}</p>
            </div>
          </div>
          <p className="text-white/80 mb-4">
            {APP_NAME} is an AI-powered job search platform connecting candidates with employers through
            resume-aware matching and recruiter tools.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={LOGO_PATH}
              download="kraftisium-logo.svg"
              className="inline-block px-4 py-2 rounded-lg border border-[#fcc636] text-[#fcc636] hover:bg-[#fcc636]/10">
              Download logo (SVG)
            </a>
            <a
              href={BRAND_MARK_PATH}
              download="kraftisium-mark.svg"
              className="inline-block px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/5">
              Download brand mark (SVG)
            </a>
          </div>
        </section>

        <section className="rounded-xl bg-[#1a1a1a] border border-white/10 p-8">
          <h2 className="text-xl font-bold text-[#fcc636] mb-4">Colors</h2>
          <ul className="grid sm:grid-cols-2 gap-4 text-sm">
            {Object.entries(brandColors).map(([name, hex]) => (
              <li key={name} className="flex items-center gap-3">
                <span className="w-10 h-10 rounded border border-white/20 shrink-0" style={{ background: hex }} />
                <span>
                  <span className="text-white capitalize">{name}</span>
                  <br />
                  <code className="text-white/60">{hex}</code>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl bg-[#1a1a1a] border border-white/10 p-8">
          <h2 className="text-xl font-bold text-[#fcc636] mb-4">Founder</h2>
          <p className="text-white font-semibold">{founder.name}</p>
          <p className="text-white/70">{founder.title}</p>
          <p className="text-white/80 text-sm mt-3">{founder.aboutBlurb}</p>
          <p className="mt-4 text-sm">
            <a href={founder.twitter} className="text-[#fcc636] hover:underline" target="_blank" rel="noopener noreferrer">
              X
            </a>
          </p>
        </section>

        <section className="rounded-xl bg-[#1a1a1a] border border-white/10 p-8">
          <h2 className="text-xl font-bold text-[#fcc636] mb-4">Media contact</h2>
          <p className="text-white/80">
            Email:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#fcc636] hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
          <Link to="/contact" className="inline-block mt-4 text-[#fcc636] hover:underline">
            Contact form →
          </Link>
        </section>
      </div>
    </StaticPageLayout>
  );
}
