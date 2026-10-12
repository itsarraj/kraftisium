import { ApplicationDetailed, APPLICATION_STATUSES } from '../../services/bffApi';
import { STATUS_META, statusLabel } from './pipelineUtils';

type Props = {
  app: ApplicationDetailed;
  onStatusChange: (status: string) => void;
  onViewResume?: () => void;
  onRestore?: () => void;
  variant?: 'column' | 'detail';
  onClick?: () => void;
};

function matchLabel(score?: number | null) {
  if (score == null) return null;
  return `${Math.round(score * 100)}%`;
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PipelineApplicantCard({
  app,
  onStatusChange,
  onViewResume,
  onRestore,
  variant = 'column',
  onClick,
}: Props) {
  const score = matchLabel(app.match_score);
  const bio = app.candidate_bio;
  const statusStyle =
    app.status in STATUS_META
      ? STATUS_META[app.status as keyof typeof STATUS_META]
      : { badge: 'bg-white/10 text-white/70' };

  const statusSelect = (
    <select
      value={app.status}
      onChange={(e) => onStatusChange(e.target.value)}
      className="w-full h-9 px-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-[#fcc636] text-xs font-bold"
    >
      {APPLICATION_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_META[s].label}
        </option>
      ))}
    </select>
  );

  if (variant === 'detail') {
    return (
      <article className="rounded-xl bg-[#2b2b2b] border border-red-500/20 p-4 flex flex-col lg:flex-row lg:items-start gap-4">
        <div
          onClick={onClick}
          className={`min-w-0 flex-1 space-y-2 ${onClick ? 'cursor-pointer group' : ''}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h4 className={`font-bold text-white ${onClick ? 'group-hover:text-[#fcc636] transition-colors' : ''}`}>
              {app.candidate_name}
            </h4>
            {score && (
              <span className="px-2 py-0.5 rounded-full bg-[#fcc636]/10 text-[#fcc636] text-[10px] font-bold">
                {score} match
              </span>
            )}
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusStyle.badge}`}>
              {statusLabel(app.status)}
            </span>
          </div>
          <p className="text-sm text-white/50 break-all">{app.candidate_email}</p>
          {bio && (
            <p className="text-xs text-white/60 line-clamp-2 whitespace-pre-wrap">{bio}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/40">
            <span>Applied {shortDate(app.applied_at)}</span>
            {app.updated_at !== app.applied_at && (
              <span>Updated {shortDate(app.updated_at)}</span>
            )}
            {app.resume_file_name && <span>Resume: {app.resume_file_name}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full lg:w-48 shrink-0">
          {statusSelect}
          {onRestore && (
            <button
              type="button"
              onClick={onRestore}
              className="h-9 px-3 rounded-lg border border-white/15 text-white/80 text-xs font-bold hover:border-[#fcc636]/40"
            >
              Move to applied
            </button>
          )}
          {onViewResume && app.resume_id && (
            <button
              type="button"
              onClick={onViewResume}
              className="h-9 px-3 rounded-lg border border-white/10 text-[#fcc636] text-xs font-bold hover:border-[#fcc636]/40"
            >
              View resume
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-lg bg-[#2b2b2b] border border-white/5 p-3 space-y-2.5">
      <div
        onClick={onClick}
        className={onClick ? 'cursor-pointer group space-y-2' : 'space-y-2'}
      >
        <div className="flex items-start justify-between gap-2 min-w-0">
          <p
            className={`font-bold text-sm text-white truncate ${
              onClick ? 'group-hover:text-[#fcc636] transition-colors' : ''
            }`}
            title={app.candidate_name}
          >
            {app.candidate_name}
          </p>
          {score && (
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-[#fcc636]/10 text-[#fcc636] text-[10px] font-bold">
              {score}
            </span>
          )}
        </div>
        <p className="text-[11px] text-white/45 truncate" title={app.candidate_email}>
          {app.candidate_email}
        </p>
        <p className="text-[10px] text-white/35">Applied {shortDate(app.applied_at)}</p>
      </div>
      {statusSelect}
      {onViewResume && app.resume_id && (
        <button
          type="button"
          onClick={onViewResume}
          className="w-full text-left text-[11px] font-bold text-[#fcc636] hover:text-[#e6b535]"
        >
          View resume →
        </button>
      )}
    </article>
  );
}
