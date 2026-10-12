import { ApplicationDetailed, RecruiterInboxApplication } from '../../services/bffApi';
import { statusLabel, STATUS_META } from './pipelineUtils';

type Props = {
  app: ApplicationDetailed | RecruiterInboxApplication;
  onShortlist: () => void;
  onReject: () => void;
  onViewResume?: () => void;
  onRestore?: () => void;
  compact?: boolean;
  onClick?: () => void;
};

function matchLabel(score?: number | null) {
  if (score == null) return null;
  return `${Math.round(score * 100)}% match`;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ApplicantCard({
  app,
  onShortlist,
  onReject,
  onViewResume,
  onRestore,
  compact,
  onClick,
}: Props) {
  const score = matchLabel(app.match_score);
  const bio = 'candidate_bio' in app ? app.candidate_bio : undefined;
  const resumeTitle = 'resume_title' in app ? app.resume_title : undefined;
  const updatedAt = 'updated_at' in app ? app.updated_at : undefined;
  const statusStyle =
    app.status in STATUS_META
      ? STATUS_META[app.status as keyof typeof STATUS_META]
      : { label: app.status, badge: 'bg-white/10 text-white/70', border: 'border-white/10' };

  return (
    <div className="p-5 rounded-xl bg-[#1a1a1a] border border-white/10 hover:border-[#fcc636]/30 transition-all flex flex-col sm:flex-row justify-between gap-4">
      <div
        onClick={onClick}
        className={`space-y-2 min-w-0 flex-grow ${onClick ? 'cursor-pointer group' : ''}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className={`font-bold text-white ${onClick ? 'group-hover:text-[#fcc636] transition-colors' : ''}`}>
            {app.candidate_name}
          </p>
          {score && (
            <span className="px-2 py-0.5 rounded-full bg-[#fcc636]/10 text-[#fcc636] text-[10px] font-bold">
              {score}
            </span>
          )}
        </div>
        <p className="text-sm text-white/50">{app.candidate_email}</p>
        {'position_title' in app && app.position_title && (
          <p className="text-xs text-white/40">
            Applied for: <span className="text-white/60">{app.position_title}</span>
          </p>
        )}
        {'company_name' in app && app.company_name && (
          <p className="text-xs text-white/40">{app.company_name}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusStyle.badge}`}>
            {statusLabel(app.status)}
          </span>
          <span className="text-[10px] text-white/40">Applied {formatWhen(app.applied_at)}</span>
          {updatedAt && updatedAt !== app.applied_at && (
            <span className="text-[10px] text-white/30">Updated {formatWhen(updatedAt)}</span>
          )}
        </div>
        {!compact && bio && (
          <p className="text-xs text-white/60 line-clamp-3 whitespace-pre-wrap">{bio}</p>
        )}
        {(resumeTitle || app.resume_file_name) && (
          <p className="text-xs text-white/50">
            Resume: {resumeTitle || app.resume_file_name}
            {resumeTitle && app.resume_file_name && resumeTitle !== app.resume_file_name && (
              <span className="text-white/30"> ({app.resume_file_name})</span>
            )}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0 sm:flex-col sm:items-stretch">
        {onViewResume && app.resume_id && (
          <button
            type="button"
            onClick={onViewResume}
            className="px-3 py-2 rounded-lg border border-white/10 text-white/70 text-xs font-bold hover:border-[#fcc636]/40"
          >
            View resume
          </button>
        )}
        {app.status === 'rejected' && onRestore && (
          <button
            type="button"
            onClick={onRestore}
            className="px-3 py-2 rounded-lg border border-white/20 text-white/80 text-xs font-bold hover:border-[#fcc636]/40"
          >
            Move to applied
          </button>
        )}
        {app.status !== 'shortlisted' && app.status !== 'hired' && app.status !== 'rejected' && (
          <button
            type="button"
            onClick={onShortlist}
            className="px-3 py-2 rounded-lg bg-[#fcc636]/10 text-[#fcc636] text-xs font-bold hover:bg-[#fcc636]/20"
          >
            Shortlist
          </button>
        )}
        {app.status !== 'rejected' && app.status !== 'hired' && (
          <button
            type="button"
            onClick={onReject}
            className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20"
          >
            Reject
          </button>
        )}
      </div>
    </div>
  );
}
