import {
  ApplicationDetailed,
  RecruiterInboxApplication,
  SuggestedCandidate,
  APPLICATION_STATUSES,
} from '../../services/bffApi';
import { STATUS_META, statusLabel } from './pipelineUtils';

type Props = {
  app: ApplicationDetailed | RecruiterInboxApplication | SuggestedCandidate | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onViewResume?: () => void;
};

function matchLabel(score?: number | null) {
  if (score == null) return null;
  return `${Math.round(score * 100)}%`;
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CandidateDetailModal({
  app,
  isOpen,
  onClose,
  onStatusChange,
  onViewResume,
}: Props) {
  if (!isOpen || !app) return null;

  const isSuggested = !('status' in app);
  const score = matchLabel(app.match_score);
  const statusStyle =
    !isSuggested && app.status in STATUS_META
      ? STATUS_META[app.status as keyof typeof STATUS_META]
      : { badge: 'bg-[#fcc636]/15 text-[#fcc636]', border: 'border-[#fcc636]/30' };

  const bio = 'candidate_bio' in app ? app.candidate_bio : null;
  const resumeTitle = 'resume_title' in app ? app.resume_title : null;
  const updatedAt = 'updated_at' in app ? app.updated_at : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-brand-surface border border-white/10 rounded-2xl shadow-brand overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all"
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Content Area */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6">
          {/* Header */}
          <div>
            <h3 className="text-2xl font-extrabold text-white leading-tight pr-8">
              {app.candidate_name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {score && (
                <span className="px-2.5 py-1 rounded-full bg-[#fcc636]/10 text-[#fcc636] text-xs font-bold border border-[#fcc636]/25 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#fcc636] animate-pulse" />
                  {score} Match Score
                </span>
              )}
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${statusStyle.badge} ${statusStyle.border}`}
              >
                {!isSuggested ? statusLabel(app.status) : 'Suggested Candidate'}
              </span>
            </div>
          </div>

          {/* Info Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-y border-white/5 py-4">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                Position Applied
              </p>
              <p className="text-sm font-semibold text-white/80 mt-0.5">
                {('position_title' in app && app.position_title) || 'This Position'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                Contact Email
              </p>
              <a
                href={`mailto:${app.candidate_email}`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#fcc636] hover:underline mt-0.5"
              >
                {app.candidate_email} ↗
              </a>
            </div>
          </div>

          {/* Biography / Bio */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/50">
              Candidate Statement / Bio
            </h4>
            <div className="bg-[#2b2b2b] border border-white/5 rounded-xl p-4 text-sm text-white/70 whitespace-pre-wrap leading-relaxed">
              {bio || (
                <span className="italic text-white/35">
                  No professional statement or bio provided by the candidate.
                </span>
              )}
            </div>
          </div>

          {/* Two Column details: Resume + Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Resume Section */}
            <div className="bg-[#2b2b2b]/40 border border-white/5 rounded-xl p-4 flex flex-col justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">
                  Resume Attachment
                </h4>
                {('resume_id' in app && app.resume_id) || resumeTitle || app.resume_file_name ? (
                  <p
                    className="text-xs font-bold text-white/80 truncate"
                    title={app.resume_file_name || resumeTitle || 'Resume'}
                  >
                    📄 {app.resume_file_name || resumeTitle || 'resume.pdf'}
                  </p>
                ) : (
                  <p className="text-xs text-white/35 italic">No resume uploaded.</p>
                )}
              </div>
              {('resume_id' in app && app.resume_id) && onViewResume && (
                <button
                  type="button"
                  onClick={onViewResume}
                  className="w-full sm:w-auto self-start px-4 py-2 rounded-lg bg-[#fcc636] hover:bg-[#e6b535] text-black font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  📥 Download Resume
                </button>
              )}
            </div>

            {/* Pipeline Status Action */}
            {!isSuggested ? (
              <div className="bg-[#2b2b2b]/40 border border-white/5 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">
                  Pipeline Stage
                </h4>
                <p className="text-[10px] text-white/40">
                  Update status to move candidate to a different stage:
                </p>
                <select
                  value={app.status}
                  onChange={(e) => onStatusChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#2b2b2b] border border-white/10 text-[#fcc636] text-xs font-bold focus:outline-none focus:border-[#fcc636]/50"
                >
                  {APPLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-[#2b2b2b]/20 border border-white/5 rounded-xl p-4 flex flex-col justify-center text-center space-y-1">
                <p className="text-xs font-bold text-white/60">Candidate has not applied yet</p>
                <p className="text-[10px] text-white/40">
                  Review this match and invite them to apply or contact them via email.
                </p>
              </div>
            )}
          </div>

          {/* Timeline Details */}
          {!isSuggested && 'applied_at' in app && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-[10px] text-white/30 border-t border-white/5 pt-4 gap-2">
              <span>Applied on {shortDate(app.applied_at)}</span>
              {updatedAt && updatedAt !== app.applied_at && (
                <span>Last active on {shortDate(updatedAt)}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
