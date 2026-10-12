import { useState } from 'react';
import { Job } from '../../services/bffApi';

type Props = {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onToggleStatus?: () => void;
  onApply?: () => void | Promise<void>;
  applied?: boolean;
};

function formatSalary(job: Job) {
  if (!job.salary_min && !job.salary_max) return 'Not specified';
  const currency = job.salary_currency || 'USD';
  const period = job.salary_period || 'yearly';
  const minStr = job.salary_min ? job.salary_min.toLocaleString() : '';
  const maxStr = job.salary_max ? job.salary_max.toLocaleString() : '';
  if (minStr && maxStr) return `${currency} ${minStr} – ${maxStr} / ${period}`;
  if (minStr) return `From ${currency} ${minStr} / ${period}`;
  return `Up to ${currency} ${maxStr} / ${period}`;
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function JobDetailModal({
  job,
  isOpen,
  onClose,
  onEdit,
  onDuplicate,
  onToggleStatus,
  onApply,
  applied,
}: Props) {
  const [applying, setApplying] = useState(false);

  if (!isOpen || !job) return null;

  const isActive = job.status !== 'closed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div className="relative w-full max-w-3xl bg-brand-surface border border-white/10 rounded-2xl shadow-brand overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
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
            <div className="flex flex-wrap items-center gap-2 pr-8">
              <h3 className="text-2xl font-extrabold text-white leading-tight">
                {job.position_title}
              </h3>
              {job.featured && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#fcc636]/15 text-[#fcc636] border border-[#fcc636]/25">
                  Featured
                </span>
              )}
            </div>
            <p className="text-sm text-white/40 mt-1">{job.company_name}</p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-y border-white/5 py-4">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                Location
              </p>
              <p className="text-sm font-semibold text-white/80 mt-0.5">{job.location}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                Job Type
              </p>
              <p className="text-sm font-semibold text-white/80 mt-0.5">
                {job.employment_type}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                Salary Range
              </p>
              <p className="text-sm font-semibold text-[#fcc636] mt-0.5">
                {formatSalary(job)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                Status
              </p>
              <span
                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${
                  isActive
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {isActive ? 'Active' : 'Closed'}
              </span>
            </div>
          </div>

          {/* Job Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/50">
              Job Description
            </h4>
            <div className="bg-[#2b2b2b]/40 border border-white/5 rounded-xl p-5 text-sm text-white/70 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {job.description || (
                <span className="italic text-white/35">No job description provided.</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-[#181818] border-t border-white/5 flex flex-wrap gap-2 justify-between items-center">
          <p className="text-[10px] text-white/30">Posted on {shortDate(job.posted_at)}</p>
          <div className="flex gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="px-4 py-2 rounded-lg border border-white/10 hover:border-[#fcc636]/40 text-white/80 font-bold text-xs transition-colors"
              >
                Edit Post
              </button>
            )}
            {onDuplicate && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDuplicate();
                }}
                className="px-4 py-2 rounded-lg border border-white/10 hover:border-[#fcc636]/40 text-white/80 font-bold text-xs transition-colors"
              >
                Duplicate
              </button>
            )}
            {onToggleStatus && (
              <button
                type="button"
                onClick={onToggleStatus}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${
                  isActive
                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/15'
                    : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/15'
                }`}
              >
                {isActive ? 'Close Job' : 'Reopen Job'}
              </button>
            )}
            {onApply && (
              <button
                type="button"
                onClick={async () => {
                  if (applied || applying) return;
                  setApplying(true);
                  try {
                    await onApply();
                  } finally {
                    setApplying(false);
                  }
                }}
                disabled={applied || applying}
                className={`flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-bold text-xs transition-all duration-300 ease-out ${
                  applied
                    ? 'bg-green-500 text-white cursor-default'
                    : 'bg-[#fcc636] text-[#2b2b2b] hover:bg-[#e6b535] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
                } ${applying ? 'opacity-80 cursor-wait' : ''}`}
              >
                {applied ? (
                  <>
                    <svg className="w-4 h-4 animate-[zoom-in_0.2s_ease-out]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Applied</span>
                  </>
                ) : applying ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-[#2b2b2b]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Applying...</span>
                  </>
                ) : (
                  'Apply Now'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
