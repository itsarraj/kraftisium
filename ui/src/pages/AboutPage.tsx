import { Link } from 'react-router-dom';
import StaticPageLayout from '../components/StaticPageLayout';
import { APP_NAME, BRAND_MARK_ASPECT, BRAND_MARK_PATH } from '../constants/brand';
import { founder } from '../constants/site';

const AboutPage = () => {
  return (
    <StaticPageLayout
      title="About us"
      description={`Learn about ${APP_NAME} — AI-powered job search and resume matching for candidates and employers.`}
      maxWidth="2xl">
      <div className="flex flex-col items-center mb-10">
        <img src={BRAND_MARK_PATH} alt="" height={56} width={Math.round(56 * BRAND_MARK_ASPECT)} className="mb-4 object-contain" />
        <h1 className="text-4xl font-bold text-center text-[#fcc636]">About {APP_NAME}</h1>
      </div>

      <section className="rounded-xl bg-[#1a1a1a] border border-white/10 p-8 mb-8 space-y-4">
        <h2 className="text-2xl font-bold text-[#fcc636]">Our mission</h2>
        <p className="text-lg text-white/90 leading-relaxed">
          {APP_NAME} helps job seekers find roles that fit their skills — not just keywords — and gives recruiters
          better-matched applicants. We combine resume intelligence, job search, and AI matching in one platform.
        </p>
        <h2 className="text-xl font-bold text-[#fcc636] pt-2">What you can do</h2>
        <ul className="list-disc list-inside space-y-2 text-white/80">
          <li>Upload a resume and build a profile for smarter matching</li>
          <li>Browse and search open roles</li>
          <li>Unlock personalized AI job matches (premium)</li>
          <li>Post jobs and manage applications as a recruiter</li>
        </ul>
        <div className="flex flex-wrap gap-3 pt-4">
          <Link
            to="/jobs"
            className="px-5 py-2 rounded-lg bg-[#fcc636] text-[#2b2b2b] font-bold hover:bg-[#e6b535]">
            Browse jobs
          </Link>
          <Link
            to="/register"
            className="px-5 py-2 rounded-lg border border-[#fcc636] text-[#fcc636] font-bold hover:bg-[#fcc636]/10">
            Create account
          </Link>
        </div>
      </section>

      <section className="rounded-xl bg-[#1a1a1a] border border-white/10 p-8 space-y-4">
        <p className="text-sm uppercase tracking-wide text-[#fcc636] font-semibold">Leadership</p>
        <h2 className="text-2xl font-bold text-white">{founder.name}</h2>
        <p className="text-[#fcc636] font-medium">{founder.title}</p>
        <p className="text-white/85 leading-relaxed">{founder.aboutBlurb}</p>
        <div className="flex flex-wrap gap-4 text-sm pt-4">
          <a href={`mailto:${founder.email}`} className="text-white hover:text-[#fcc636] transition-colors">
            Email
          </a>
          <a href={founder.twitter} target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#fcc636] transition-colors">
            X (Twitter)
          </a>
        </div>
      </section>

      <p className="text-center text-white/50 text-sm mt-8">
        Questions?{' '}
        <Link to="/contact" className="text-[#fcc636] hover:underline">
          Contact us
        </Link>
      </p>
    </StaticPageLayout>
  );
};

export default AboutPage;
