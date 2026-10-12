import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import CareerRoleCard from '../components/careers/CareerRoleCard';
import { APP_NAME, BRAND_MARK_ASPECT, BRAND_MARK_PATH } from '../constants/brand';
import {
  CAREER_BENEFITS,
  CAREER_DEPARTMENTS,
  CAREER_FAQ,
  CAREER_OPENINGS,
  CAREERS_CONTACT_EMAIL,
  HIRING_STEPS,
  type CareerDepartment,
} from '../constants/careers';
import { founder } from '../constants/site';

export default function CareersPage() {
  const [department, setDepartment] = useState<CareerDepartment | 'All'>('All');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const filtered = useMemo(() => {
    if (department === 'All') return CAREER_OPENINGS;
    return CAREER_OPENINGS.filter((o) => o.department === department);
  }, [department]);

  return (
    <>
      <Helmet>
        <title>Careers at {APP_NAME} — Internships & remote roles</title>
        <meta
          name="description"
          content="Join Kraftisium. Remote internships in engineering, marketing, sales, product, design, and more. Build AI-powered job search used by candidates and recruiters worldwide."
        />
        <meta property="og:title" content={`Careers at ${APP_NAME}`} />
        <meta
          property="og:description"
          content="Remote internships and early-career roles at an AI hiring startup. Ship real work on web, mobile, and Rust."
        />
      </Helmet>

      <div className="min-h-screen bg-[#2b2b2b] text-white">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 md:px-16 py-20 md:py-28 border-b border-white/5">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(#fcc636 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="container mx-auto relative z-10 max-w-4xl text-center">
            <img
              src={BRAND_MARK_PATH}
              alt=""
              height={48}
              width={Math.round(48 * BRAND_MARK_ASPECT)}
              className="mx-auto mb-6 object-contain"
            />
            <p className="text-[#fcc636] font-semibold tracking-widest uppercase text-sm mb-4">
              Careers at {APP_NAME}
            </p>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Build the future of <span className="text-[#fcc636]">hiring</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
              We are an AI-powered job search platform — live on web and Android. Join us as an
              intern and ship work that real candidates and recruiters use every day.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <a
                href="#open-roles"
                className="px-8 py-4 rounded-xl bg-[#fcc636] text-[#2b2b2b] font-bold shadow-brand hover:bg-[#e6b535] transition-colors">
                View open roles
              </a>
              <Link
                to="/about"
                className="px-8 py-4 rounded-xl border border-white/20 text-white font-bold hover:border-[#fcc636] hover:text-[#fcc636] transition-colors">
                About {APP_NAME}
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-center">
              {[
                { label: 'Open roles', value: String(CAREER_OPENINGS.length) },
                { label: 'Workplace', value: 'Remote' },
                { label: 'Duration', value: '3–6 mo' },
                { label: 'Stack', value: 'Rust · React' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/10 bg-[#1a1a1a]/80 py-4 px-2">
                  <p className="text-2xl font-bold text-[#fcc636]">{stat.value}</p>
                  <p className="text-xs text-white/50 mt-1 uppercase tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why join */}
        <section className="px-6 md:px-16 py-20 border-b border-white/5">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold text-center text-[#fcc636]">Why join Kraftisium</h2>
            <p className="mt-4 text-center text-white/60 max-w-2xl mx-auto">
              Early-stage team, production product, direct founder access. You will learn fast and
              own outcomes — not sit in meetings about meetings.
            </p>
            <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {CAREER_BENEFITS.map((b) => (
                <div
                  key={b.title}
                  className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
                  <h3 className="text-lg font-bold text-white">{b.title}</h3>
                  <p className="mt-2 text-sm text-white/65 leading-relaxed">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What we build */}
        <section className="px-6 md:px-16 py-20 border-b border-white/5 bg-[#1a1a1a]/50">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold text-center">What you will work on</h2>
            <div className="mt-10 grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-white/10 p-6">
                <p className="text-[#fcc636] font-bold text-sm uppercase tracking-wider">
                  Candidates
                </p>
                <p className="mt-3 text-white/70 text-sm leading-relaxed">
                  Resume upload, AI job matches, applications, and Premium upgrades — helping people
                  find roles that fit skills, not just keywords.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 p-6">
                <p className="text-[#fcc636] font-bold text-sm uppercase tracking-wider">
                  Recruiters
                </p>
                <p className="mt-3 text-white/70 text-sm leading-relaxed">
                  Job posts, applicant pipeline, AI-suggested candidates, and Premium recruiter
                  tools — less screening, better hires.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 p-6">
                <p className="text-[#fcc636] font-bold text-sm uppercase tracking-wider">
                  Platform
                </p>
                <p className="mt-3 text-white/70 text-sm leading-relaxed">
                  Rust API, React web, Expo mobile, Postgres, semantic search, payments, and
                  production deploys on kraftisium.xyz.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Open roles */}
        <section id="open-roles" className="px-6 md:px-16 py-20 border-b border-white/5 scroll-mt-20">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-center text-[#fcc636]">Open roles</h2>
            <p className="mt-4 text-center text-white/60">
              {CAREER_OPENINGS.length} remote internships · flexible start · path to full-time
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setDepartment('All')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  department === 'All'
                    ? 'bg-[#fcc636] text-[#2b2b2b]'
                    : 'bg-[#1a1a1a] border border-white/10 text-white/70 hover:text-white'
                }`}>
                All
              </button>
              {CAREER_DEPARTMENTS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDepartment(d)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    department === d
                      ? 'bg-[#fcc636] text-[#2b2b2b]'
                      : 'bg-[#1a1a1a] border border-white/10 text-white/70 hover:text-white'
                  }`}>
                  {d}
                </button>
              ))}
            </div>

            <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((opening) => (
                <CareerRoleCard key={opening.id} opening={opening} />
              ))}
            </div>

            {filtered.length === 0 ? (
              <p className="text-center text-white/50 mt-8">No roles in this department right now.</p>
            ) : null}
          </div>
        </section>

        {/* Hiring process */}
        <section className="px-6 md:px-16 py-20 border-b border-white/5">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center">How we hire</h2>
            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {HIRING_STEPS.map((s) => (
                <div key={s.step} className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#fcc636] text-[#2b2b2b] font-bold text-lg flex items-center justify-center">
                    {s.step}
                  </div>
                  <h3 className="mt-4 font-bold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm text-white/60">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 md:px-16 py-20 border-b border-white/5">
          <div className="container mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold text-center text-[#fcc636]">FAQ</h2>
            <div className="mt-10 space-y-3">
              {CAREER_FAQ.map((item, i) => (
                <div
                  key={item.q}
                  className="rounded-xl border border-white/10 bg-[#1a1a1a] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left font-medium text-white hover:bg-white/5 transition-colors">
                    {item.q}
                    <span className="text-[#fcc636] text-xl ml-4 shrink-0">
                      {openFaq === i ? '−' : '+'}
                    </span>
                  </button>
                  {openFaq === i ? (
                    <div className="px-5 pb-4 text-sm text-white/65 leading-relaxed border-t border-white/5 pt-3">
                      {item.a}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 md:px-16 py-20">
          <div className="container mx-auto max-w-3xl text-center rounded-2xl border border-[#fcc636]/30 bg-[#1a1a1a] p-10 md:p-14">
            <h2 className="text-3xl font-bold">Do not see your role?</h2>
            <p className="mt-4 text-white/65">
              We are always open to exceptional people. Send your resume and what you would like to
              work on.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href={`mailto:${CAREERS_CONTACT_EMAIL}?subject=${encodeURIComponent('General application — Kraftisium')}`}
                className="px-8 py-4 rounded-xl bg-[#fcc636] text-[#2b2b2b] font-bold hover:bg-[#e6b535] transition-colors">
                Email {founder.name}
              </a>
              <Link
                to="/contact?intent=careers"
                className="px-8 py-4 rounded-xl border border-white/20 font-bold hover:border-[#fcc636] hover:text-[#fcc636] transition-colors">
                Contact form
              </Link>
            </div>
            <p className="mt-6 text-sm text-white/40">
              {CAREERS_CONTACT_EMAIL} · Remote-first · kraftisium.xyz
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
