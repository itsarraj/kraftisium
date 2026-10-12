import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import StaticPageLayout from '../components/StaticPageLayout';
import { APP_NAME } from '../constants/brand';
import { SUPPORT_EMAIL, SITE_URL } from '../constants/site';

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-bold text-[#fcc636] mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside space-y-2 ml-1">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function TermsPage() {
  const updated = 'June 8, 2026';

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const el = document.querySelector(hash);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <StaticPageLayout
      title="Terms and Conditions"
      description={`Terms and Conditions for ${APP_NAME} at ${SITE_URL}.`}
      maxWidth="lg">
      <h1 className="text-4xl font-bold text-center mb-2 text-[#fcc636]">Terms and Conditions</h1>
      <p className="text-center text-white/50 text-sm mb-6">Last updated: {updated}</p>

      <nav className="flex flex-wrap justify-center gap-4 mb-10 text-sm">
        <a href="#general" className="text-[#fcc636] hover:underline">
          General
        </a>
        <a href="#candidate" className="text-[#fcc636] hover:underline">
          Candidates
        </a>
        <a href="#employer" className="text-[#fcc636] hover:underline">
          Employers
        </a>
        <a href="#payments" className="text-[#fcc636] hover:underline">
          Payments
        </a>
        <a href="#disclaimers" className="text-[#fcc636] hover:underline">
          Disclaimers
        </a>
      </nav>

      <div className="space-y-8 text-white/85 leading-relaxed">
        <p>
          Welcome to {APP_NAME} ({SITE_URL}), an AI-powered job search and recruitment platform. These Terms and
          Conditions (&ldquo;Terms&rdquo;) form a binding agreement between you and {APP_NAME}. By creating an account,
          browsing jobs, posting roles, or using any part of the service, you accept these Terms and our{' '}
          <Link to="/privacy" className="text-[#fcc636] hover:underline">
            Privacy Policy
          </Link>
          . If you do not agree, do not use {APP_NAME}.
        </p>

        <p>
          &ldquo;Candidate&rdquo; (also &ldquo;job seeker&rdquo; or &ldquo;student&rdquo;) means a person who registers
          to search jobs, upload a resume, receive AI matches, or apply to listings. &ldquo;Employer&rdquo; or
          &ldquo;Recruiter&rdquo; means a person or organisation posting jobs, reviewing applications, or using
          recruiter tools on behalf of a company.
        </p>

        <Section id="general" title="1. General terms (all users)">
          <Section title="Registration and account security">
            <List
              items={[
                'Provide accurate, current, and complete registration information and keep it updated.',
                'You are responsible for safeguarding your password and all activity under your account.',
                'Notify us immediately at ' + SUPPORT_EMAIL + ' if you suspect unauthorized access.',
                'One person must not maintain multiple accounts to evade limits, bans, or policy enforcement.',
                'You must be at least 16 years old to use the service. If you are under 18, you confirm you have permission from a parent or guardian where required by law.',
              ]}
            />
          </Section>

          <Section title="Acceptable use">
            <List
              items={[
                'Do not upload malware, unlawful content, hate speech, harassment, or misleading information.',
                'Do not scrape, bulk-download, or use automated tools to harvest user data, resumes, or job listings without written permission.',
                'Do not use platform data to train third-party AI or machine-learning models without our prior written consent.',
                'Do not impersonate another person, company, or institution.',
                'Do not attempt to bypass security, access other users’ private data, or disrupt the service.',
              ]}
            />
          </Section>

          <Section title="Your content">
            <p>
              You retain ownership of resumes, profile text, company descriptions, and other content you upload. You
              grant {APP_NAME} a non-exclusive license to store, process, display, and use that content solely to
              operate the platform — including search, AI matching, application delivery, and recruiter dashboards.
            </p>
          </Section>

          <Section title="Communications">
            <p>
              By registering, you may receive service emails (verification, password reset, application updates) and,
              where you opt in, product or promotional messages. You can unsubscribe from marketing emails using the
              link in those messages. Service-critical notices may still be sent.
            </p>
          </Section>

          <Section title="Suspension and termination">
            <p>
              We may suspend or terminate accounts that violate these Terms, applicable law, or community standards,
              with or without prior notice depending on severity. You may close your account at any time by contacting{' '}
              {SUPPORT_EMAIL}.
            </p>
          </Section>
        </Section>

        <Section id="candidate" title="2. Terms for candidates">
          <p className="text-white/70 text-sm -mt-2 mb-2">
            These terms apply when you register or continue as a candidate on {APP_NAME}.
          </p>

          <Section title="Profile and applications">
            <List
              items={[
                'Resume and profile information must be truthful. Do not misrepresent skills, experience, education, or identity.',
                'Apply only to roles that genuinely interest you and match your qualifications. Spam or mass irrelevant applications may lead to account restrictions.',
                'Once you accept an interview or offer communicated through an employer, make reasonable efforts to attend or respond promptly.',
                'You are responsible for your own due diligence on employers, compensation, and working conditions before accepting any role.',
              ]}
            />
          </Section>

          <Section title="AI job matches">
            <List
              items={[
                'AI-suggested jobs are recommendations based on your resume and platform data. They are not guarantees of employment, interviews, or fit.',
                'Match scores and rankings may change as jobs, resumes, or models are updated.',
                'Free accounts may have limits on AI matches; Premium plans are described at checkout.',
                'Do not treat AI output as legal, financial, or professional career advice.',
              ]}
            />
          </Section>

          <Section title="Candidate conduct">
            <List
              items={[
                'Communicate professionally with employers through the platform and in interviews.',
                'Do not share employer contact details or internal hiring data with third parties for commercial purposes.',
                'Report suspicious employers, fraudulent listings, or requests for upfront payment to ' + SUPPORT_EMAIL + '.',
                'Do not submit plagiarised resumes or materials you are not authorized to share.',
              ]}
            />
          </Section>

          <Section title="Safety tips for candidates">
            <p>{APP_NAME} does not permit employers to:</p>
            <List
              items={[
                'Charge application fees, training deposits, or security deposits to be considered for a job.',
                'Request sensitive identity documents (e.g. Aadhaar, PAN) before a legitimate offer stage without clear purpose.',
                'Offer roles involving illegal activity, adult content, gambling, multi-level marketing disguised as jobs, or unpaid labour misrepresented as “assessment.”',
                'Pressure you to open bank, trading, or demat accounts as part of an application test.',
              ]}
            />
            <p>
              If an employer asks for any of the above, stop the process and report the listing. {APP_NAME} does not
              guarantee that every employer is vetted to the same standard; use caution.
            </p>
          </Section>
        </Section>

        <Section id="employer" title="3. Terms for employers and recruiters">
          <p className="text-white/70 text-sm -mt-2 mb-2">
            These terms apply when you register or continue as an employer on {APP_NAME}.
          </p>

          <Section title="Authorization and job postings">
            <List
              items={[
                'You must be authorized to hire on behalf of the company named in your profile or job posts.',
                'Job listings must be accurate: role title, location, work mode, compensation range (where shown), and requirements must not mislead candidates.',
                'Agency recruiters may post only for clients they are authorized to represent. Misrepresentation may result in permanent account removal.',
                'You may not repost the same role excessively, post fake openings to collect resumes, or use listings primarily for marketing unrelated services.',
                'Company logos and branding you upload must be used with permission and may be displayed on job cards and recruiter profiles.',
              ]}
            />
          </Section>

          <Section title="Hiring conduct">
            <List
              items={[
                'Treat applicant data as confidential. Use it only for evaluating and hiring for the relevant role.',
                'Do not sell, rent, or share applicant resumes or contact details with third parties.',
                'Communications with candidates must be professional and free of harassment or discrimination prohibited by law.',
                'Pre-interview assignments must be reasonable, relevant to the role, and not primarily free labour.',
                'Honour compensation and terms communicated in the listing or offer letter. Material negative changes after application may be reported and penalized.',
                `Respond to serious applicant complaints referred by ${APP_NAME} within a reasonable time.`,
              ]}
            />
          </Section>

          <Section title="Prohibited employer activity">
            <p>{APP_NAME} does not allow:</p>
            <List
              items={[
                'Unpaid “internships” or jobs that violate applicable minimum wage or labour laws, except where clearly lawful and disclosed.',
                'Listings whose primary purpose is lead generation, course sales, or unrelated product promotion.',
                'Requests for candidates to pay money at any stage of hiring.',
                'Discriminatory requirements unrelated to genuine job needs.',
                'Third-party reposting of jobs scraped from other sites without rights to do so.',
              ]}
            />
          </Section>

          <Section title="Recruiter dashboard and applications">
            <List
              items={[
                'Application statuses you set (reviewing, shortlisted, rejected, etc.) should reflect good-faith hiring progress.',
                'Downloading applicant resumes is permitted for hiring purposes for that role only.',
                'We may remove listings or limit visibility if they receive repeated quality or fraud complaints.',
              ]}
            />
          </Section>
        </Section>

        <Section id="payments" title="4. Premium subscriptions and payments">
          <List
            items={[
              'Candidate Premium (e.g. yearly plan) unlocks features described on the upgrade and checkout pages at the time of purchase.',
              'Payments are processed by third-party providers (such as Razorpay). Your payment is subject to their terms as well.',
              'Fees are generally charged in advance. Refund eligibility, if any, is stated at checkout or in promotional offer terms.',
              'Founding-member or promotional free Premium is subject to the conditions shown when you enroll and may be limited by slot count or time.',
              'We may change pricing for new purchases with notice on the website. Existing paid periods are honored for the term purchased unless otherwise stated.',
            ]}
          />
        </Section>

        <Section id="disclaimers" title="5. Disclaimers and liability">
          <p>
            {APP_NAME} is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We do not warrant uninterrupted
            access, error-free AI matching, or hiring outcomes. To the fullest extent permitted by law, {APP_NAME} and its
            operators are not liable for indirect, incidental, or consequential damages arising from your use of the
            service, employer conduct, or employment decisions.
          </p>
          <p>
            You agree to indemnify {APP_NAME} against claims arising from your content, your breach of these Terms, or
            your misuse of applicant or employer data.
          </p>
        </Section>

        <Section title="6. Intellectual property">
          <p>
            The {APP_NAME} name, logo, website design, and platform software are owned by {APP_NAME} or its licensors.
            You may not copy, reverse-engineer, or reuse our branding without permission.
          </p>
        </Section>

        <Section title="7. Changes to these Terms">
          <p>
            We may update these Terms from time to time. The &ldquo;Last updated&rdquo; date will change when we do.
            Continued use after changes constitutes acceptance. Material changes may be communicated by email or an
            in-app notice where appropriate.
          </p>
        </Section>

        <Section title="8. Governing law">
          <p>
            These Terms are governed by the laws of India. Disputes shall be subject to the courts of competent
            jurisdiction in India, unless mandatory consumer protection law in your location provides otherwise.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these Terms:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#fcc636] hover:underline">
              {SUPPORT_EMAIL}
            </a>{' '}
            or the{' '}
            <Link to="/contact" className="text-[#fcc636] hover:underline">
              contact page
            </Link>
            .
          </p>
        </Section>
      </div>
    </StaticPageLayout>
  );
}
