import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Job } from '../services/bffApi';

interface JobCardProps {
  job: Job;
  detailTo?: string;
  linkState?: { from?: string };
  onApply?: (jobId: string) => void | Promise<void>;
  applied?: boolean;
  className?: string;
  topBadge?: string;
  onClick?: () => void;
  saved?: boolean;
  onToggleSave?: (jobId: string) => void | Promise<void>;
}

const JobCard: React.FC<JobCardProps> = ({
  job,
  detailTo,
  linkState,
  onApply,
  applied,
  className = '',
  topBadge,
  onClick,
  saved,
  onToggleSave,
}) => {
  const [applying, setApplying] = useState(false);
  const [toggling, setToggling] = useState(false);
  const timeAgo = (date: string) => {
    const now = new Date();
    const posted = new Date(date);
    const diffInMs = now.getTime() - posted.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    if (diffInHours > 0) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    return `${diffInMins} min${diffInMins > 1 ? 's' : ''} ago`;
  };

  const formatSalary = (min?: number, max?: number, currency?: string) => {
    if (!min && !max) return 'Salary not disclosed';
    const curr = currency || 'USD';
    if (min && max) return `${(min / 1000).toFixed(0)}-${(max / 1000).toFixed(0)}k ${curr}`;
    if (min) return `>${(min / 1000).toFixed(0)}k ${curr}`;
    return `<${(max! / 1000).toFixed(0)}k ${curr}`;
  };

  const matchPct = job.match_score !== undefined ? Math.round(job.match_score * 100) : undefined;

  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    if (matchPct !== undefined && matchPct > 0) {
      let start = 0;
      const end = matchPct;
      const duration = 1500;
      const incrementTime = Math.max(16, duration / end);
      
      const timer = setInterval(() => {
        start += 1;
        setDisplayScore(start);
        if (start >= end) clearInterval(timer);
      }, incrementTime);
      return () => clearInterval(timer);
    }
  }, [matchPct]);

  const info = (
    <>
      <div className="flex-grow-0 flex-shrink-0 w-[72px] h-[72px] relative overflow-hidden rounded bg-brand-bg flex items-center justify-center border border-white/10">
        {job.company_logo_url ? (
          <img src={job.company_logo_url} alt={job.company_name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl font-bold text-[#fcc636]">{job.company_name.charAt(0)}</span>
        )}
      </div>
      <div className="flex flex-col justify-start items-start flex-grow relative gap-3 min-w-0">
        <div className="flex flex-col justify-start items-start self-stretch flex-grow-0 flex-shrink-0 gap-1.5">
          <div className="flex flex-col justify-start items-start self-stretch min-w-0 flex-grow-0 flex-shrink-0 gap-1">
            <div className="flex justify-start items-center self-stretch min-w-0 relative gap-3">
              <p className="min-w-0 truncate text-lg text-left text-white/70">
                {job.company_name}
              </p>
            </div>
            <div className="flex flex-wrap justify-start items-center self-stretch min-w-0 relative gap-2">
              <p className="min-w-0 break-words text-2xl font-medium text-left text-white group-hover:text-[#fcc636] transition-colors">
                {job.position_title}
              </p>
              {job.featured && (
                <div className="flex justify-start items-center flex-grow-0 flex-shrink-0 relative overflow-hidden gap-1 px-1.5 py-0.5 rounded bg-brand-accent/20">
                  <p className="flex-grow-0 flex-shrink-0 text-xs font-medium text-left text-[#fcc636]">
                    Featured
                  </p>
                </div>
              )}
              {new Date().getTime() - new Date(job.posted_at).getTime() < 24 * 60 * 60 * 1000 && (
                <div className="flex justify-start items-center flex-grow-0 flex-shrink-0 relative overflow-hidden gap-1 px-1.5 py-0.5 rounded bg-brand-accent/10">
                  <p className="flex-grow-0 flex-shrink-0 text-xs font-medium text-left text-[#fcc636]">
                    New post
                  </p>
                </div>
              )}
            </div>
          </div>

          {matchPct !== undefined && (
            <div className={`mt-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${matchPct > 80 ? 'bg-[#fcc636]/10 border-[#fcc636]/50 shadow-[0_0_15px_rgba(252,198,54,0.3)]' : 'bg-white/5 border-white/10'}`}>
              <div className="relative w-4 h-4">
                <svg className="w-4 h-4 transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-white/10" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className={matchPct > 80 ? "text-[#fcc636]" : "text-white/50"} strokeWidth="4" strokeDasharray={`${displayScore}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>
              <span className={`text-xs font-bold ${matchPct > 80 ? 'text-[#fcc636]' : 'text-white/70'}`}>
                {displayScore}% AI Match {matchPct > 80 && '🔥'}
              </span>
            </div>
          )}

          <div className="flex flex-wrap justify-start items-center flex-grow-0 flex-shrink-0 relative gap-x-6 gap-y-2 py-0.5 mt-1">
            <div className="flex justify-start items-center flex-grow-0 flex-shrink-0 relative gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-grow-0 flex-shrink-0 w-4 h-4 relative text-[#fcc636]">
                <path fillRule="evenodd" clipRule="evenodd" d="M8 2C6.80653 2 5.66193 2.47411 4.81802 3.31802C3.97411 4.16193 3.5 5.30653 3.5 6.5C3.5 8.56997 4.65592 10.4548 5.8773 11.8594C6.48189 12.5547 7.08775 13.1152 7.54257 13.5018C7.72245 13.6547 7.87812 13.7799 8 13.875C8.12188 13.7799 8.27755 13.6547 8.45743 13.5018C8.91225 13.1152 9.51812 12.5547 10.1227 11.8594C11.3441 10.4548 12.5 8.56997 12.5 6.5C12.5 5.30653 12.0259 4.16193 11.182 3.31802C10.3381 2.47411 9.19347 2 8 2ZM8 14.5L8.28673 14.9096C8.11457 15.0301 7.88543 15.0301 7.71327 14.9096L8 14.5Z" fill="currentColor" fillOpacity="0.7" />
              </svg>
              <p className="flex-grow-0 flex-shrink-0 text-base text-left text-white/60">
                {job.location}
              </p>
            </div>
            <div className="flex justify-start items-center flex-grow-0 flex-shrink-0 relative gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-grow-0 flex-shrink-0 w-4 h-4 relative text-[#fcc636]">
                <path fillRule="evenodd" clipRule="evenodd" d="M8 2.5C4.96243 2.5 2.5 4.96243 2.5 8C2.5 11.0376 4.96243 13.5 8 13.5C11.0376 13.5 13.5 11.0376 13.5 8C13.5 4.96243 11.0376 2.5 8 2.5ZM1.5 8C1.5 4.41015 4.41015 1.5 8 1.5C11.5899 1.5 14.5 4.41015 14.5 8C14.5 11.5899 11.5899 14.5 8 14.5C4.41015 14.5 1.5 11.5899 1.5 8Z" fill="currentColor" fillOpacity="0.7" />
              </svg>
              <p className="flex-grow-0 flex-shrink-0 text-base text-left text-white/60">
                {job.employment_type}
              </p>
            </div>
            <div className="flex justify-start items-center flex-grow-0 flex-shrink-0 relative gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-grow-0 flex-shrink-0 w-4 h-4 relative text-[#fcc636]">
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <p className="flex-grow-0 flex-shrink-0 text-base text-left text-white/60">
                {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
              </p>
            </div>
            <div className="flex justify-start items-center flex-grow-0 flex-shrink-0 relative gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-grow-0 flex-shrink-0 w-4 h-4 relative text-[#fcc636]">
                <path fillRule="evenodd" clipRule="evenodd" d="M2 3C2 2.44772 2.44772 2 3 2H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V3ZM13 3H3V13H13V3Z" fill="currentColor" fillOpacity="0.7" />
              </svg>
              <p className="flex-grow-0 flex-shrink-0 text-base text-left text-white/60">
                {timeAgo(job.posted_at)}
              </p>
            </div>
          </div>
        </div>
        <p className="self-stretch flex-grow-0 flex-shrink-0 text-base text-left text-white/50 line-clamp-2 whitespace-pre-wrap">
          {job.description || 'No description available for this position.'}
        </p>
      </div>
    </>
  );

  return (
    <div
      className={`flex justify-start items-start self-stretch flex-grow-0 flex-shrink-0 relative gap-6 p-6 rounded-xl bg-brand-surface border border-white/10 hover:border-brand-accent/30 transition-all group shadow-brand ${className}`}
    >
      {topBadge && (
        <div className="absolute -top-2 -left-2 z-10">
          <div className="bg-[#fcc636] text-[#2b2b2b] text-[8px] font-black px-2 py-0.5 rounded shadow-brand transform -rotate-12 uppercase tracking-tighter">
            {topBadge}
          </div>
        </div>
      )}
      {onToggleSave && (
        <button
          type="button"
          aria-label={saved ? 'Unsave job' : 'Save job'}
          title={saved ? 'Unsave job' : 'Save job'}
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (toggling) return;
            setToggling(true);
            try {
              await onToggleSave(job.id);
            } finally {
              setToggling(false);
            }
          }}
          disabled={toggling}
          className="absolute bottom-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 transition-colors disabled:opacity-50"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill={saved ? '#fcc636' : 'none'}
            stroke={saved ? '#fcc636' : 'currentColor'}
            strokeWidth="1.5"
            className="text-white/70"
          >
            <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1h7A1.5 1.5 0 0 1 13 2.5v12l-5-3-5 3v-12Z" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {detailTo ? (
        <Link
          to={detailTo}
          state={linkState}
          onClick={(e) => {
            if (onClick) {
              e.preventDefault();
              onClick();
            }
          }}
          className="flex gap-6 flex-grow min-w-0 text-inherit no-underline"
        >
          {info}
        </Link>
      ) : (
        <div className="flex gap-6 flex-grow min-w-0" onClick={onClick}>{info}</div>
      )}
      {onApply && (
        <button
          type="button"
          onClick={async () => {
            if (applied || applying) return;
            setApplying(true);
            try {
              await onApply(job.id);
            } finally {
              setApplying(false);
            }
          }}
          disabled={applied || applying}
          className={`self-start shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-brand transition-all duration-300 ease-out ${
            applied
              ? 'bg-brand-success text-white cursor-default'
              : 'bg-brand-accent text-brand-bg hover:bg-brand-accentHover active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
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
            'Apply now'
          )}
        </button>
      )}
    </div>
  );
};

export default JobCard;
