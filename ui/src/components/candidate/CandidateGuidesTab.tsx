import React, { useState } from 'react';
import { useReferralSettings } from '../../hooks/useReferralSettings';

type GuideSection = {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
};

function buildGuides(creditsPerReferral: number | '—', creditsNeeded: number | '—', monthsLabel: string): GuideSection[] {
  return [
  {
    id: 'profile',
    title: 'Your Profile & Resume',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    content: (
      <div className="space-y-4 text-white/80 text-sm leading-relaxed">
        <p>
          Your profile is the foundation of your job search on Kraftisium. Our <strong>AI Matcher</strong> reads your Bio and Resume to seamlessly connect you with relevant jobs and employers.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Upload Your Resume:</strong> We support PDF and Text files. Your most recent upload is what recruiters see when you apply to jobs. Older resumes are safely archived.</li>
          <li><strong>Craft Your Bio:</strong> Use the bio to highlight your key skills, short-term/long-term goals, and why you're a great fit. A clear bio dramatically increases your match rate with open roles!</li>
          <li><strong>Edit Profile:</strong> Navigate to the "Edit Profile" tab to update your name, email, bio, or upload a new resume at any time.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'applications',
    title: 'Tracking Applications',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    content: (
      <div className="space-y-4 text-white/80 text-sm leading-relaxed">
        <p>
          The <strong>My Applications</strong> tab provides a bird's-eye view of everywhere you've applied.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Visual Pipeline:</strong> Each application displays a timeline. Watch your status move from "Applied", to "Shortlisted", to "Interview", and finally "Hired".</li>
          <li><strong>Review Job Details:</strong> Click "View Details" on any application card to review the original job description, company name, and location.</li>
          <li><strong>At-a-Glance Dashboard:</strong> The top statistics cards show how many jobs you've applied to and how many are actively in review or at the interview stage.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'referrals',
    title: 'Referrals & Credits',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    content: (
      <div className="space-y-4 text-white/80 text-sm leading-relaxed">
        <p>
          You can earn free Premium subscription time by inviting friends to join the platform.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Share Your Link:</strong> Find your unique referral link on the sidebar of your profile. Share it anywhere!</li>
          <li><strong>Earn Credits:</strong> When a friend signs up using your link and uploads their resume, you automatically earn <strong>{creditsPerReferral} credits</strong>.</li>
          <li><strong>Redeem for Premium:</strong> Once you reach {creditsNeeded} credits, click the "Redeem" button to instantly unlock {monthsLabel} of Kraftisium Premium.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'premium',
    title: 'Premium Candidate Benefits',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    content: (
      <div className="space-y-4 text-white/80 text-sm leading-relaxed">
        <p>
          Upgrading to Premium supercharges your job search and gives you an edge over the competition.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Unlimited AI Matches:</strong> Free users have a limited number of AI-driven job matches. Premium unlocks unlimited AI matching to find the perfect roles for you.</li>
          <li><strong>Top of the Pile:</strong> Premium candidates are visually highlighted and bumped to the top when recruiters search for talent.</li>
          <li><strong>Promo codes:</strong> If you have a promo code, enter it at checkout for a discount or free Premium access.</li>
        </ul>
      </div>
    ),
  },
];
}

export default function CandidateGuidesTab() {
  const referralSettings = useReferralSettings();
  const creditsPerReferral = referralSettings?.credits_per_referral ?? '—';
  const creditsNeeded = referralSettings?.credits_required_for_redemption ?? '—';
  const premiumMonths = referralSettings?.redemption_premium_months;
  const monthsLabel = premiumMonths == null ? '1 free month' : premiumMonths === 1 ? '1 free month' : `${premiumMonths} free months`;

  const GUIDES = buildGuides(creditsPerReferral, creditsNeeded, monthsLabel);
  const [openSectionId, setOpenSectionId] = useState<string>(GUIDES[0].id);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-2 mb-8">
        <h2 className="text-3xl font-bold text-white">Job Seeker Guides</h2>
        <p className="text-white/50">Learn how to make your profile stand out, track your applications, and earn free premium access by referring friends.</p>
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
