import React, { useState } from 'react';

type GuideSection = {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
};

const GUIDES: GuideSection[] = [
  {
    id: 'overview',
    title: 'Dashboard Overview',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    content: (
      <div className="space-y-4 text-white/80 text-sm leading-relaxed">
        <p>
          The <strong>Overview</strong> tab gives you a high-level snapshot of your recruitment pipeline at a glance.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Quick Metrics:</strong> View the total number of active jobs and total incoming applications.</li>
          <li><strong>Recent Activity:</strong> See the latest candidates who have applied or were uploaded to your pipelines.</li>
          <li><strong>Quick Actions:</strong> From the recent activity feed, you can quickly download a candidate's resume, move them to 'Shortlisted', or mark them as 'Rejected' without opening the full pipeline view.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'unified_inbox',
    title: 'Unified Inbox',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    content: (
      <div className="space-y-4 text-white/80 text-sm leading-relaxed">
        <p>
          The <strong>Unified Inbox</strong> is your central hub for managing all incoming applications across all your active job postings.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Cross-Job View:</strong> Unlike the Pipeline tab which focuses on one job at a time, the Unified Inbox lets you triage applications from all jobs in one list.</li>
          <li><strong>Instant Triage:</strong> Review candidate details and immediately transition them to 'Shortlisted' or 'Rejected'.</li>
          <li><strong>Best For:</strong> Daily morning reviews of all new applications across the entire company.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'jobs',
    title: 'Job Management',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    content: (
      <div className="space-y-4 text-white/80 text-sm leading-relaxed">
        <p>
          The <strong>Jobs</strong> tab is where you create and manage the listings that candidates will see on the platform.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Creating Jobs:</strong> Click "+ Create Job" to draft a new role. Be sure to fill out the description and requirements thoroughly, as our AI Matcher uses this text to find the best candidates.</li>
          <li><strong>Duplicating Jobs:</strong> Need to hire for the same role in a different location? Use the duplicate button to instantly copy all job details into a new draft.</li>
          <li><strong>Suggested Candidates:</strong> Once a job is active, our AI automatically scans the platform for users whose profiles match the job description and highlights them as "Suggested".</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'pipeline',
    title: 'Pipeline (Kanban)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18M15 3v18" />
      </svg>
    ),
    content: (
      <div className="space-y-4 text-white/80 text-sm leading-relaxed">
        <p>
          The <strong>Pipeline</strong> tab provides a visual, drag-and-drop workflow for tracking candidates through a specific job's hiring stages.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Job Selection:</strong> Start by selecting an active job from the dropdown menu to view its specific candidate pipeline.</li>
          <li><strong>Drag & Drop:</strong> Click and drag a candidate card from 'Applied' to 'Shortlisted', 'Interviewing', or 'Hired'.</li>
          <li><strong>Status Updates:</strong> Moving a card automatically updates the candidate's status in the database.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'bulk_upload',
    title: 'Bulk Upload',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    content: (
      <div className="space-y-4 text-white/80 text-sm leading-relaxed">
        <p>
          The <strong>Bulk Upload</strong> tab allows you to ingest local PDF resumes directly into a specific job's candidate list.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>How it works:</strong> Select a job, then drag and drop multiple PDF resumes onto the dropzone.</li>
          <li><strong>AI Parsing:</strong> The system automatically extracts the text from the PDFs and creates "Shadow Profiles" for these candidates, attaching them directly to the selected job.</li>
          <li><strong>Usage:</strong> Perfect for when you receive resumes via email or external sources but want to manage them all within the platform's unified pipeline and AI matching system.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'talent_pools',
    title: 'Talent Pools & AI Matcher',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <circle cx="12" cy="11" r="3" />
      </svg>
    ),
    content: (
      <div className="space-y-4 text-white/80 text-sm leading-relaxed">
        <p>
          <strong>Talent Pools</strong> allow you to build independent databases of resumes. The <strong>AI Matcher</strong> then lets you search across these pools using advanced semantic text queries.
        </p>
        <h4 className="font-bold text-[#fcc636] mt-4 mb-2">Managing Pools</h4>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Create Pools:</strong> Group candidates by role type (e.g., "Frontend Developers", "Designers").</li>
          <li><strong>Upload Resumes:</strong> Similar to Bulk Upload, drop PDFs into a pool to extract their text and store them for later searching.</li>
        </ul>
        <h4 className="font-bold text-[#fcc636] mt-4 mb-2">Using the AI Matcher</h4>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Select Pools:</strong> Check the boxes for one or multiple talent pools you want to search across.</li>
          <li><strong>Select Job vs. Custom Text:</strong> You can either select an existing Job Post (the AI will use its description) OR enter a "Custom Text" prompt.</li>
          <li><strong>Semantic Search:</strong> The AI doesn't just look for exact keyword matches. If you type "Expert in building scalable React apps", it will find candidates whose resumes suggest frontend and scalable architecture experience, ranking them by percentage match.</li>
        </ul>
      </div>
    ),
  },
];

export default function RecruiterGuidesTab() {
  const [openSectionId, setOpenSectionId] = useState<string>(GUIDES[0].id);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-2 mb-8">
        <h2 className="text-3xl font-bold text-white">Recruiter Guides</h2>
        <p className="text-white/50">Learn how to make the most out of your dashboard, streamline your hiring pipeline, and leverage AI Matching to find the best talent.</p>
      </div>

      <div className="space-y-4">
        {GUIDES.map((guide) => {
          const isOpen = openSectionId === guide.id;

          return (
            <div 
              key={guide.id}
              className={`bg-[#1a1a1a] border rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'border-[#fcc636]' : 'border-white/10 hover:border-white/30'}`}
            >
              <button
                onClick={() => setOpenSectionId(isOpen ? '' : guide.id)}
                className="w-full flex items-center justify-between p-5 text-left bg-transparent focus:outline-none"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl transition-colors ${isOpen ? 'bg-[#fcc636] text-[#1a1a1a]' : 'bg-[#2b2b2b] text-white/50'}`}>
                    {guide.icon}
                  </div>
                  <span className={`font-bold text-lg transition-colors ${isOpen ? 'text-[#fcc636]' : 'text-white'}`}>
                    {guide.title}
                  </span>
                </div>
                <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#fcc636]' : 'text-white/30'}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </button>
              
              <div 
                className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}
              >
                <div className="p-6 pt-0 border-t border-white/5 mt-2 bg-[#2b2b2b]/30">
                  <div className="pt-4">
                    {guide.content}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
