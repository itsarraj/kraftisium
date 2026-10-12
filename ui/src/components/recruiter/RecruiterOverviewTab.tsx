import { useState } from 'react';
import ApplicantCard from './ApplicantCard';
import CandidateDetailModal from './CandidateDetailModal';
import { RecruiterOverview, RecruiterInboxApplication } from '../../services/bffApi';

type Props = {
  overview: RecruiterOverview | null;
  hasCompany: boolean;
  onGoTab: (tab: 'settings' | 'jobs' | 'applicants') => void;
  onShortlist: (id: string) => void;
  onReject: (id: string) => void;
  onViewResume: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
};

export default function RecruiterOverviewTab({
  overview,
  hasCompany,
  onGoTab,
  onShortlist,
  onReject,
  onViewResume,
  onStatusChange,
}: Props) {
  const [selectedApp, setSelectedApp] = useState<RecruiterInboxApplication | null>(null);

  if (!hasCompany) {
    return (
      <div className="p-10 rounded-xl bg-[#1a1a1a] border border-white/10 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Welcome to your recruiter dashboard</h2>
        <p className="text-white/50 max-w-md mx-auto">
          Set up your company profile first, then post a job to start receiving applications.
        </p>
        <button
          type="button"
          onClick={() => onGoTab('settings')}
          className="px-6 py-3 rounded-xl bg-[#fcc636] text-[#2b2b2b] font-bold"
        >
          Set up company
        </button>
      </div>
    );
  }

  const stats = [
    { label: 'Active jobs', value: overview?.active_jobs ?? 0 },
    { label: 'New (7 days)', value: overview?.new_applications_7d ?? 0 },
    { label: 'Total applicants', value: overview?.total_applications ?? 0 },
  ];

  const aiHoursSaved = Math.round(((overview?.total_applications ?? 0) * 15) / 60);

  return (
    <div className="space-y-8">
      {!overview?.setup_complete && (
        <div className="p-6 rounded-xl border border-[#fcc636]/30 bg-[#fcc636]/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-bold text-white">Complete your company profile</p>
            <p className="text-sm text-white/50 mt-1">Add a logo and about section so candidates trust your listings.</p>
          </div>
          <button type="button" onClick={() => onGoTab('settings')} className="px-5 py-2 rounded-lg bg-[#fcc636] text-[#2b2b2b] font-bold text-sm">
            Finish setup
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gamified AI Time Saved Widget */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-[#fcc636]/20 to-[#ffaa00]/5 border border-[#fcc636]/50 shadow-[0_0_15px_rgba(252,198,54,0.15)] relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor" className="text-[#fcc636]">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <p className="text-4xl font-black text-[#fcc636] drop-shadow-[0_2px_10px_rgba(252,198,54,0.4)]">{aiHoursSaved}h</p>
          <p className="text-xs text-[#fcc636] mt-1 uppercase tracking-wider font-bold">AI Time Saved</p>
          <p className="text-[10px] text-white/50 mt-1 leading-tight">vs manual screening</p>
        </div>

        {stats.map((s) => (
          <div key={s.label} className="p-5 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-brand flex flex-col justify-center">
            <p className="text-3xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-white/50 mt-1 uppercase tracking-wide font-bold">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => onGoTab('jobs')} className="px-5 py-3 rounded-xl bg-[#fcc636] text-[#2b2b2b] font-bold text-sm">
          Post a job
        </button>
        <button type="button" onClick={() => onGoTab('applicants')} className="px-5 py-3 rounded-xl border border-white/20 text-white font-bold text-sm hover:border-[#fcc636]/40">
          Review applications
        </button>
      </div>

      {(() => {
        const topAiMatches = overview?.recent_applications
          ?.filter((app) => (app.match_score || 0) >= 70 && app.status !== 'rejected')
          .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
          .slice(0, 3) || [];

        if (topAiMatches.length === 0) return null;

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#fcc636] flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
                Top AI Candidates
              </h3>
              <button type="button" onClick={() => onGoTab('applicants')} className="text-xs text-white/50 hover:text-white">View all matches</button>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {topAiMatches.map((app) => (
                <div key={app.id} className="relative rounded-xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#fcc636]/20 to-transparent opacity-50 pointer-events-none" />
                  <ApplicantCard
                    app={app}
                    compact
                    onShortlist={() => onShortlist(app.id)}
                    onReject={() => onReject(app.id)}
                    onViewResume={() => onViewResume(app.id)}
                    onClick={() => setSelectedApp(app)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white">Recent applicants</h3>
        {overview?.recent_applications?.length ? (
          overview.recent_applications.map((app) => (
            <ApplicantCard
              key={app.id}
              app={app}
              compact
              onShortlist={() => onShortlist(app.id)}
              onReject={() => onReject(app.id)}
              onViewResume={() => onViewResume(app.id)}
              onClick={() => setSelectedApp(app)}
            />
          ))
        ) : (
          <p className="text-white/50 text-sm py-8 text-center border border-dashed border-white/10 rounded-xl">
            No applications yet. Post a job to get started.
          </p>
        )}
      </div>

      {/* Candidate Details Modal */}
      {selectedApp && (
        <CandidateDetailModal
          app={overview?.recent_applications?.find((a) => a.id === selectedApp.id) || selectedApp}
          isOpen={true}
          onClose={() => setSelectedApp(null)}
          onStatusChange={(status) => onStatusChange(selectedApp.id, status)}
          onViewResume={() => onViewResume(selectedApp.id)}
        />
      )}
    </div>
  );
}
