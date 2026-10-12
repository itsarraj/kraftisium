import { founder } from './site';

export type CareerDepartment =
  | 'Engineering'
  | 'Marketing'
  | 'Sales'
  | 'Product'
  | 'Design'
  | 'Operations'
  | 'Customer Success';

export interface CareerSection {
  heading: string;
  items: string[];
}

export interface CareerOpening {
  id: string;
  title: string;
  department: CareerDepartment;
  employmentType: string;
  location: string;
  duration: string;
  tags: string[];
  summary: string;
  highlights: string[];
  sections: CareerSection[];
  applicationAsk: string;
}

export const CAREER_DEPARTMENTS: CareerDepartment[] = [
  'Engineering',
  'Marketing',
  'Sales',
  'Product',
  'Design',
  'Customer Success',
  'Operations',
];

export const CAREER_BENEFITS = [
  {
    title: 'Remote-first',
    description:
      'Work from anywhere. Async day-to-day with weekly video syncs (IST / EU-friendly hours).',
  },
  {
    title: 'Real ownership',
    description:
      'Ship work that goes live on kraftisium.xyz and our Android app — not shelf-ware.',
  },
  {
    title: 'Direct mentorship',
    description: 'Small team with direct access to the founder. Fast feedback, no layers.',
  },
  {
    title: 'Path to full-time',
    description: 'Strong interns are considered for full-time roles as Kraftisium grows.',
  },
  {
    title: 'Modern stack exposure',
    description: 'Rust, React, Expo, Postgres, AI matching, and production DevOps.',
  },
  {
    title: 'Flexible schedule',
    description: 'Outcomes matter more than clock-watching. Balance study and work.',
  },
];

export const HIRING_STEPS = [
  {
    step: '1',
    title: 'Apply',
    description: 'Send your resume and the role-specific ask listed on each opening.',
  },
  {
    step: '2',
    title: 'Phone screen',
    description: '15–20 minute conversation about your background and motivation.',
  },
  {
    step: '3',
    title: 'Practical',
    description: 'Short exercise or role-play when relevant — usually under 2 hours.',
  },
  {
    step: '4',
    title: 'Offer',
    description: 'We move quickly for strong fits. Start dates are flexible.',
  },
];

export const CAREER_FAQ = [
  {
    q: 'Are these paid internships?',
    a: 'Compensation depends on role, location, and duration. We discuss this openly in the offer stage. University credit arrangements are supported where applicable.',
  },
  {
    q: 'Is the team fully remote?',
    a: 'Yes. Kraftisium is remote-first. We collaborate async and meet on weekly video calls with overlap for IST and EU-friendly time zones.',
  },
  {
    q: 'How long are internships?',
    a: 'Typically 3–6 months with a flexible start date. We can adjust for academic calendars.',
  },
  {
    q: 'Can interns convert to full-time?',
    a: 'Yes. Strong performers are our first choice when we open full-time roles.',
  },
  {
    q: 'How should I apply?',
    a: 'Use the Apply button on any role page or email animesh.raj@kraftisium.xyz with the role title, your resume, and the application ask for that position.',
  },
  {
    q: 'When will I hear back?',
    a: 'We review every application. You should hear within one to two weeks. If you have not, feel free to follow up politely.',
  },
];

export const CAREER_OPENINGS: CareerOpening[] = [
  {
    id: 'software-engineer-intern',
    title: 'Software Engineer Intern',
    department: 'Engineering',
    employmentType: 'Internship',
    location: 'Remote',
    duration: '3–6 months',
    tags: ['Rust', 'TypeScript', 'React', 'React Native', 'PostgreSQL', 'AI'],
    summary:
      'Ship production features across our Rust API, React web app, Expo mobile app, and AI matching pipeline.',
    highlights: [
      'Production code on kraftisium.xyz + Android',
      'Full-stack: Rust BFF, React, Expo',
      'AI job search and semantic matching',
    ],
    sections: [
      {
        heading: 'What you will do',
        items: [
          'Build features on web (React + TypeScript) and/or mobile (Expo / React Native)',
          'Contribute to our Rust backend — auth, subscriptions, job search, recruiter APIs',
          'Improve AI job matching, search indexing, and candidate–role ranking',
          'Open PRs, participate in code review, fix bugs, and document what you ship',
        ],
      },
      {
        heading: 'What we are looking for',
        items: [
          'Pursuing or recently completed CS / software engineering (or equivalent experience)',
          'Solid fundamentals: Git, HTTP/APIs, and at least one of TypeScript, Rust, or React',
          'Curiosity about full-stack development and AI-powered products',
          'Bonus: PostgreSQL, Docker, or Android development',
        ],
      },
    ],
    applicationAsk:
      'Include a link to one project you are proud of (GitHub or live URL) and describe your specific contribution.',
  },
  {
    id: 'marketing-intern',
    title: 'Marketing Intern',
    department: 'Marketing',
    employmentType: 'Internship',
    location: 'Remote',
    duration: '3–6 months',
    tags: ['Content', 'Campaigns', 'B2B', 'LinkedIn', 'Email'],
    summary:
      'Plan and execute campaigns for candidates and recruiters. Own messaging that drives sign-ups and partnerships.',
    highlights: [
      'Campaigns for candidates + recruiters',
      'Emails, landing copy, LinkedIn content',
      'Metrics and iteration',
    ],
    sections: [
      {
        heading: 'What you will do',
        items: [
          'Plan campaigns for candidate and recruiter sign-ups',
          'Write landing copy, emails, and LinkedIn posts',
          'Support launches: mobile app, features, promo programs',
          'Track traffic and sign-up metrics; report what works',
        ],
      },
      {
        heading: 'What we are looking for',
        items: [
          'Marketing, communications, or business background (or strong writing portfolio)',
          'Clear English writing — concise and human',
          'Comfort with LinkedIn, email, and basic analytics',
          'Interest in both B2B (recruiters) and B2C (job seekers)',
        ],
      },
    ],
    applicationAsk:
      'Submit one sample LinkedIn post for Kraftisium and a one-paragraph campaign idea (audience + CTA).',
  },
  {
    id: 'sales-intern',
    title: 'Sales Intern',
    department: 'Sales',
    employmentType: 'Internship',
    location: 'Remote',
    duration: '3–6 months',
    tags: ['B2B', 'Outreach', 'Recruiting', 'Pipeline', 'CRM'],
    summary:
      'Outbound to recruiters and agencies. Build pipeline, follow up, and learn B2B SaaS sales with the founder.',
    highlights: [
      'B2B outreach to recruiters',
      'Pipeline tracking and follow-up',
      'Learn sales from the founder',
    ],
    sections: [
      {
        heading: 'What you will do',
        items: [
          'Research recruiters, agencies, and HR teams; build prospect lists',
          'Personalize LinkedIn and email outreach',
          'Follow up, book intro calls, and track pipeline',
          'Document feedback from calls to improve product and messaging',
        ],
      },
      {
        heading: 'What we are looking for',
        items: [
          'Business or communications background, or proven outreach experience',
          'Respectful, persistent follow-up — not spammy blasts',
          'Good listener; accurate notes and next steps',
          'Bonus: staffing, recruiting, or B2B SaaS exposure',
        ],
      },
    ],
    applicationAsk:
      'Write a 3-sentence cold LinkedIn message to a recruitment agency owner introducing Kraftisium.',
  },
  {
    id: 'growth-intern',
    title: 'Growth Intern',
    department: 'Marketing',
    employmentType: 'Internship',
    location: 'Remote',
    duration: '3–6 months',
    tags: ['Growth', 'Funnel', 'Experiments', 'Referrals', 'Analytics'],
    summary:
      'Run experiments on sign-ups, activations, referrals, and Premium conversion. Hypothesis-driven, metrics-first.',
    highlights: [
      'Funnel analysis and experiments',
      'Referral and promo flows',
      'Weekly metrics readouts',
    ],
    sections: [
      {
        heading: 'What you will do',
        items: [
          'Map candidate and recruiter journeys; find drop-off points',
          'Run small experiments on CTAs, onboarding, referrals, and redeem flows',
          'Track funnel metrics weekly and present simple readouts',
          'Research growth tactics from comparable hiring-tech products',
        ],
      },
      {
        heading: 'What we are looking for',
        items: [
          'Analytical mindset — hypotheses before hacks',
          'Comfort with spreadsheets and conversion thinking',
          'Clear written communication for experiment results',
          'Bonus: SQL basics or A/B testing familiarity',
        ],
      },
    ],
    applicationAsk:
      'Describe one growth experiment for Kraftisium: hypothesis, metric, and how you would test it in two weeks.',
  },
  {
    id: 'product-intern',
    title: 'Product Intern',
    department: 'Product',
    employmentType: 'Internship',
    location: 'Remote',
    duration: '3–6 months',
    tags: ['Product', 'UX', 'Roadmap', 'User research', 'Specs'],
    summary:
      'User research, specs, and prioritization on a live AI hiring product serving candidates and recruiters.',
    highlights: [
      'User interviews and journey mapping',
      'Specs and prioritization with engineering',
      'B2B + B2C product exposure',
    ],
    sections: [
      {
        heading: 'What you will do',
        items: [
          'Talk to candidates and recruiters; synthesize feedback',
          'Write user stories and acceptance criteria',
          'Review UX flows and propose improvements',
          'Track product metrics and competitive landscape',
        ],
      },
      {
        heading: 'What we are looking for',
        items: [
          'Product, CS, design, or business background with structured thinking',
          'Excellent written communication',
          'User empathy and prioritization judgment',
          'Bonus: Figma, wireframing, or SQL',
        ],
      },
    ],
    applicationAsk:
      'Pick one Kraftisium flow (e.g. recruiter first job post or candidate AI matches) and list pain points plus 3 improvements.',
  },
  {
    id: 'content-social-media-intern',
    title: 'Content & Social Media Intern',
    department: 'Marketing',
    employmentType: 'Internship',
    location: 'Remote',
    duration: '3–6 months',
    tags: ['LinkedIn', 'X', 'Content', 'Social', 'Copywriting'],
    summary:
      'Turn product updates and hiring insights into LinkedIn and X content people read and share.',
    highlights: [
      'LinkedIn + X content calendar',
      'Hiring tips and product launches',
      'Engagement and performance tracking',
    ],
    sections: [
      {
        heading: 'What you will do',
        items: [
          'Plan and publish 2–4 posts per week on LinkedIn and X',
          'Write hiring tips, product updates, and behind-the-build stories',
          'Engage in recruiter and job-search conversations',
          'Track performance and iterate on hooks and formats',
        ],
      },
      {
        heading: 'What we are looking for',
        items: [
          'Strong English writing — punchy, clear, on-brand',
          'Understanding of LinkedIn culture (recruiting + careers audiences)',
          'Reliable deadlines and consistent voice',
          'Bonus: carousels, threads, or short video scripts',
        ],
      },
    ],
    applicationAsk:
      'Submit 3 sample posts: one product-focused, one career tip for job seekers, one aimed at recruiters.',
  },
  {
    id: 'customer-success-intern',
    title: 'Customer Success Intern',
    department: 'Customer Success',
    employmentType: 'Internship',
    location: 'Remote',
    duration: '3–6 months',
    tags: ['Support', 'Onboarding', 'Recruiters', 'Documentation'],
    summary:
      'Help candidates and recruiters succeed on Kraftisium — support, onboarding, and feedback to product.',
    highlights: [
      'Email support for users',
      'Recruiter onboarding walkthroughs',
      'FAQ and help content',
    ],
    sections: [
      {
        heading: 'What you will do',
        items: [
          'Respond to user questions via email and contact flows',
          'Onboard recruiters: first job post, pipeline basics',
          'Help candidates with profile, resume, and AI matches',
          'Document FAQs and escalate bugs with clear repro steps',
        ],
      },
      {
        heading: 'What we are looking for',
        items: [
          'Patient, clear communicator',
          'Organized follow-through on open tickets',
          'Empathy for job seekers and busy recruiters',
          'Bonus: support, tutoring, or community moderation experience',
        ],
      },
    ],
    applicationAsk:
      'Write a sample reply (under 150 words) to: "I signed up as a recruiter but cannot figure out how to post my first job."',
  },
  {
    id: 'operations-intern',
    title: 'Operations Intern',
    department: 'Operations',
    employmentType: 'Internship',
    location: 'Remote',
    duration: '3–6 months',
    tags: ['Operations', 'Process', 'Data', 'Notion', 'Coordination'],
    summary:
      'Keep the business running smoothly — processes, trackers, light data work, and cross-team coordination.',
    highlights: [
      'SOPs and internal trackers',
      'Light reporting for leadership',
      'Tool and vendor research',
    ],
    sections: [
      {
        heading: 'What you will do',
        items: [
          'Maintain trackers: partners, promos, hiring pipeline, deploy checklists',
          'Document SOPs for deploy, onboarding, and support escalation',
          'Export metrics and build simple reports in spreadsheets',
          'Coordinate scheduling, notes, and follow-ups',
        ],
      },
      {
        heading: 'What we are looking for',
        items: [
          'Detail-oriented and process-minded',
          'Comfort with Sheets, Notion, and email',
          'Trustworthy with internal information',
          'Bonus: light SQL or Docker familiarity',
        ],
      },
    ],
    applicationAsk:
      'Describe a system or process you built or improved (5–8 sentences: problem, action, outcome).',
  },
  {
    id: 'design-ux-intern',
    title: 'Design / UX Intern',
    department: 'Design',
    employmentType: 'Internship',
    location: 'Remote',
    duration: '3–6 months',
    tags: ['Figma', 'UX', 'UI', 'Mobile', 'Design systems'],
    summary:
      'Improve recruiter and candidate flows on web and mobile. Figma mocks aligned to the Kraftisium brand.',
    highlights: [
      'Figma wireframes and hi-fi mocks',
      'Web + mobile consistency',
      'Dark UI and accessibility',
    ],
    sections: [
      {
        heading: 'What you will do',
        items: [
          'Audit signup, job post, matches, checkout, and recruiter dashboard flows',
          'Produce wireframes and high-fidelity mocks in Figma',
          'Improve empty states, errors, and microcopy with product',
          'Create social and app-store assets when needed',
        ],
      },
      {
        heading: 'What we are looking for',
        items: [
          'Portfolio with at least 2 case studies showing process',
          'Figma proficiency; responsive web + mobile awareness',
          'Accessible contrast and readable hierarchy',
          'Bonus: design systems or hiring/career product experience',
        ],
      },
    ],
    applicationAsk:
      'Link your portfolio and describe one UX improvement for our recruiter dashboard or candidate AI matches.',
  },
];

export function getCareerOpening(id: string): CareerOpening | undefined {
  return CAREER_OPENINGS.find((o) => o.id === id);
}

export function careerApplyMailto(role: CareerOpening): string {
  const subject = encodeURIComponent(`Application: ${role.title}`);
  const body = encodeURIComponent(
    `Hi Animesh,\n\nI am applying for the ${role.title} role at Kraftisium.\n\n` +
      `Application ask: ${role.applicationAsk}\n\n` +
      `[Your response here]\n\n` +
      `Resume: [attach or link]\n\n` +
      `Start date availability:\n` +
      `Hours per week:\n` +
      `Timezone:\n`,
  );
  return `mailto:${founder.email}?subject=${subject}&body=${body}`;
}

export const CAREERS_CONTACT_EMAIL = founder.email;
