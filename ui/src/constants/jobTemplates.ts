export interface JobTemplate {
  id: string;
  label: string;
  position_title: string;
  employment_type: string;
  location: string;
  description: string;
  tags: string;
}

export const JOB_TEMPLATES: JobTemplate[] = [
  {
    id: 'software-engineer',
    label: 'Software Engineer',
    position_title: 'Software Engineer',
    employment_type: 'Full-time',
    location: 'Remote',
    tags: 'JavaScript, TypeScript, React, Node.js',
    description: `## The Role
We're looking for a Software Engineer to build and ship product features with a small, focused team.

## What You'll Do
• Design, build, and maintain web applications
• Collaborate with product and design on user-facing features
• Write clean, tested code and participate in code review

## What We're Looking For
• 3+ years professional software development
• Strong experience with modern JavaScript/TypeScript
• Comfort with REST APIs and relational databases

## Why Join
• Competitive salary and remote-friendly culture
• Learning budget and flexible hours

## Eligibility
Open to candidates authorized to work in the listed location.`,
  },
  {
    id: 'product-manager',
    label: 'Product Manager',
    position_title: 'Product Manager',
    employment_type: 'Full-time',
    location: 'Hybrid',
    tags: 'Product, Roadmap, Agile, Analytics',
    description: `## The Role
Own the roadmap for a key product area and work closely with engineering and design.

## What You'll Do
• Define requirements and prioritize the backlog
• Run discovery with users and stakeholders
• Track metrics and iterate on outcomes

## What We're Looking For
• 4+ years in product management
• Strong written communication and analytical skills
• Experience shipping B2B or consumer software

## Why Join
• High ownership and direct impact on growth
• Collaborative team with clear mission

## Eligibility
Must be able to work from our hub 2 days per week.`,
  },
  {
    id: 'sales-rep',
    label: 'Sales Representative',
    position_title: 'Sales Representative',
    employment_type: 'Full-time',
    location: 'Onsite',
    tags: 'Sales, CRM, B2B, Outreach',
    description: `## The Role
Drive new business by identifying prospects and closing deals with mid-market clients.

## What You'll Do
• Prospect and qualify inbound and outbound leads
• Run demos and manage pipeline in CRM
• Hit monthly and quarterly revenue targets

## What We're Looking For
• 2+ years B2B sales experience
• Strong communication and follow-through
• Familiarity with Salesforce or similar CRM

## Why Join
• Uncapped commission structure
• Clear path to senior sales roles

## Eligibility
On-site role; valid work authorization required.`,
  },
];

export const DEFAULT_JOB_DESC_PLACEHOLDER = JOB_TEMPLATES[0].description;
