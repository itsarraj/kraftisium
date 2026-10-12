import { Helmet } from 'react-helmet';
import { Link, Navigate, useParams } from 'react-router-dom';
import { APP_NAME } from '../constants/brand';
import {
  careerApplyMailto,
  CAREERS_CONTACT_EMAIL,
  getCareerOpening,
  HIRING_STEPS,
} from '../constants/careers';
import { founder } from '../constants/site';

export default function CareerRolePage() {
  const { roleId } = useParams<{ roleId: string }>();
  const opening = roleId ? getCareerOpening(roleId) : undefined;

  if (!opening) {
    return <Navigate to="/careers" replace />;
  }

  const applyMailto = careerApplyMailto(opening);
  const contactHref = `/contact?intent=apply&role=${encodeURIComponent(opening.id)}`;

  return (
    <>
      <Helmet>
        <title>
          {opening.title} — Careers at {APP_NAME}
        </title>
        <meta name="description" content={opening.summary} />
        <meta property="og:title" content={`${opening.title} at ${APP_NAME}`} />
        <meta property="og:description" content={opening.summary} />
      </Helmet>

      <div className="min-h-screen bg-[#2b2b2b] text-white">
        <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
          <Link
            to="/careers"
            className="text-sm text-[#fcc636] hover:underline inline-flex items-center gap-1">
            ← All careers
          </Link>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#fcc636] px-3 py-1 rounded-full bg-[#fcc636]/10 border border-[#fcc636]/30">
              {opening.department}
            </span>
            <span className="text-xs text-white/60 px-3 py-1 rounded-full bg-[#1a1a1a] border border-white/10">
              {opening.employmentType}
            </span>
            <span className="text-xs text-white/60 px-3 py-1 rounded-full bg-[#1a1a1a] border border-white/10">
              {opening.location}
            </span>
            <span className="text-xs text-white/60 px-3 py-1 rounded-full bg-[#1a1a1a] border border-white/10">
              {opening.duration}
            </span>
          </div>

          <h1 className="mt-6 text-4xl md:text-5xl font-bold">{opening.title}</h1>
          <p className="mt-4 text-lg text-white/70 leading-relaxed">{opening.summary}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {opening.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-md bg-[#1a1a1a] border border-white/10 text-white/70">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={applyMailto}
              className="px-8 py-4 rounded-xl bg-[#fcc636] text-[#2b2b2b] font-bold shadow-brand hover:bg-[#e6b535] transition-colors">
              Apply via email →
            </a>
            <Link
              to={contactHref}
              className="px-8 py-4 rounded-xl border border-white/20 font-bold hover:border-[#fcc636] hover:text-[#fcc636] transition-colors">
              Contact form
            </Link>
          </div>

          <div className="mt-12 space-y-10">
            {opening.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-bold text-[#fcc636]">{section.heading}</h2>
                <ul className="mt-4 space-y-3">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3 text-white/80 text-sm leading-relaxed">
                      <span className="text-[#fcc636] shrink-0 mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <section className="rounded-2xl border border-[#fcc636]/30 bg-[#1a1a1a] p-6">
              <h2 className="text-xl font-bold text-[#fcc636]">Why Kraftisium</h2>
              <ul className="mt-4 space-y-2 text-sm text-white/75">
                <li>• Meaningful work from week one on a live product</li>
                <li>• Remote-first with direct founder mentorship</li>
                <li>• Path to a full-time offer for strong performers</li>
                <li>• Flexible 3–6 month internship; IST / EU-friendly sync</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
              <h2 className="text-xl font-bold text-white">Application ask</h2>
              <p className="mt-3 text-white/75 text-sm leading-relaxed">{opening.applicationAsk}</p>
              <p className="mt-4 text-sm text-white/50">
                Include your resume, start date, hours per week, and timezone in your application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white">Hiring process</h2>
              <ol className="mt-4 space-y-4">
                {HIRING_STEPS.map((s) => (
                  <li key={s.step} className="flex gap-4">
                    <span className="w-8 h-8 shrink-0 rounded-full bg-[#fcc636]/20 text-[#fcc636] font-bold text-sm flex items-center justify-center">
                      {s.step}
                    </span>
                    <div>
                      <p className="font-semibold text-white">{s.title}</p>
                      <p className="text-sm text-white/60 mt-0.5">{s.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <div className="mt-14 pt-10 border-t border-white/10 text-center">
            <p className="text-white/60 text-sm">Questions about this role?</p>
            <a
              href={`mailto:${CAREERS_CONTACT_EMAIL}`}
              className="mt-2 inline-block text-[#fcc636] font-medium hover:underline">
              {founder.name} · {CAREERS_CONTACT_EMAIL}
            </a>
            <div className="mt-8">
              <a
                href={applyMailto}
                className="inline-flex px-10 py-4 rounded-xl bg-[#fcc636] text-[#2b2b2b] font-bold hover:bg-[#e6b535] transition-colors">
                Apply for this role
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
