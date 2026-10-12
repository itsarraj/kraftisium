import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_JOB_DESC_PLACEHOLDER, JOB_TEMPLATES } from '../../constants/jobTemplates';
import {
  CreateJobRequest,
  Job,
  RecruiterLimitsInfo,
  SuggestedCandidate,
  UpdateJobRequest,
} from '../../services/bffApi';
import JobDetailModal from './JobDetailDrawer';
import CandidateDetailModal from './CandidateDetailModal';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'CHF', 'JPY'] as const;

type Props = {
  companyId: string | null;
  jobs: Job[];
  limits: RecruiterLimitsInfo | null;
  suggestedCandidates: SuggestedCandidate[];
  suggestedLoading: boolean;
  onLoadSuggested: (jobId: string) => void;
  onCreateJob: (payload: CreateJobRequest) => Promise<void>;
  onUpdateJob: (jobId: string, data: UpdateJobRequest) => Promise<void>;
  onDuplicateJob: (jobId: string) => Promise<void>;
  onRequestIntro: (jobId: string, candidateUserId: string, note?: string) => Promise<void>;
  onGoToBulkUpload: (jobId: string) => void;
};

const emptyForm = {
  position_title: '',
  salary_min: '',
  salary_max: '',
  salary_currency: 'USD',
  salary_period: 'yearly',
  description: '',
  employment_type: 'Full-time',
  location: 'Remote',
  tags: '',
  featured: false,
};

function matchPct(score: number) {
  return `${Math.round(score * 100)}%`;
}

export default function RecruiterJobsTab({
  companyId,
  jobs,
  limits,
  suggestedCandidates,
  suggestedLoading,
  onLoadSuggested,
  onCreateJob,
  onUpdateJob,
  onDuplicateJob,
  onRequestIntro,
  onGoToBulkUpload,
}: Props) {
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [suggestedJobId, setSuggestedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<SuggestedCandidate | null>(null);
  const [introSentTo, setIntroSentTo] = useState<Set<string>>(new Set());
  const [introSending, setIntroSending] = useState<string | null>(null);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMode('list');
  };

  const startEdit = (job: Job) => {
    setEditingId(job.id);
    setForm({
      position_title: job.position_title,
      salary_min: job.salary_min ? String(Math.round(job.salary_min / 1000)) : '',
      salary_max: job.salary_max ? String(Math.round(job.salary_max / 1000)) : '',
      salary_currency: job.salary_currency || 'USD',
      salary_period: job.salary_period || 'yearly',
      description: job.description || '',
      employment_type: job.employment_type,
      location: job.location,
      tags: '',
      featured: Boolean(job.featured),
    });
    setMode('edit');
  };

  const toggleSuggested = (jobId: string) => {
    if (suggestedJobId === jobId) {
      setSuggestedJobId(null);
      return;
    }
    setSuggestedJobId(jobId);
    onLoadSuggested(jobId);
  };

  const buildPayload = (): CreateJobRequest | null => {
    if (!companyId || !form.position_title.trim()) return null;
    const minRaw = form.salary_min ? parseInt(form.salary_min.replace(/\D/g, ''), 10) : undefined;
    const maxRaw = form.salary_max ? parseInt(form.salary_max.replace(/\D/g, ''), 10) : undefined;
    return {
      company_id: companyId,
      position_title: form.position_title.trim(),
      location: form.location,
      employment_type: form.employment_type,
      salary_min: minRaw != null ? minRaw * 1000 : undefined,
      salary_max: maxRaw != null ? maxRaw * 1000 : undefined,
      salary_currency: form.salary_currency,
      salary_period: form.salary_period,
      description: form.description.trim() || undefined,
      tags: form.tags.trim() ? form.tags.split(/[,\s]+/).filter(Boolean) : undefined,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) return;
    setSubmitting(true);
    try {
      if (mode === 'edit' && editingId) {
        await onUpdateJob(editingId, {
          position_title: payload.position_title,
          location: payload.location,
          employment_type: payload.employment_type,
          salary_min: payload.salary_min,
          salary_max: payload.salary_max,
          salary_currency: payload.salary_currency,
          salary_period: payload.salary_period,
          description: payload.description,
          featured: limits?.can_feature_jobs ? form.featured : undefined,
        });
      } else {
        await onCreateJob(payload);
      }
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const canCreate = limits?.can_create_job !== false;

  if (!companyId) {
    return (
      <p className="text-[#fcc636] text-sm p-6 rounded-xl bg-[#1a1a1a] border border-white/10">
        Create your company profile before posting jobs.
      </p>
    );
  }

  if (mode === 'list') {
    return (
      <div className="space-y-6">
        {limits && (
          <div className="p-4 rounded-xl bg-[#1a1a1a] border border-white/10 text-sm text-white/70">
            {limits.is_premium ? (
              <p>
                Premium: unlimited active jobs
                {limits.can_feature_jobs ? ' · featured listings enabled' : ''}.
              </p>
            ) : (
              <p>
                Free plan: {limits.active_jobs} of {limits.free_active_jobs_limit} active jobs used.
                {!canCreate && (
                  <>
                    {' '}
                    <Link to="/checkout" className="text-[#fcc636] underline">
                      Upgrade to premium
                    </Link>{' '}
                    for unlimited posts and featured listings.
                  </>
                )}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Your job posts</h2>
          <button
            type="button"
            disabled={!canCreate}
            onClick={() => { setForm(emptyForm); setMode('create'); }}
            className="px-5 py-2.5 rounded-xl bg-[#fcc636] text-[#2b2b2b] font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + New job
          </button>
        </div>
        {jobs.length === 0 ? (
          <p className="text-white/50 text-center py-12 border border-dashed border-white/10 rounded-xl">
            No jobs yet. Post your first opening.
          </p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-xl bg-[#1a1a1a] border border-white/10 overflow-hidden">
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div
                    onClick={() => setSelectedJob(job)}
                    className="cursor-pointer group flex-grow min-w-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-white group-hover:text-[#fcc636] transition-colors">{job.position_title}</p>
                      {job.featured && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#fcc636]/15 text-[#fcc636]">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/50 mt-1">
                      {job.location} · {job.employment_type}
                      {job.status === 'closed' && ' · Closed'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSuggested(job.id)}
                      className={`px-3 py-2 rounded-lg border text-xs font-bold ${
                        suggestedJobId === job.id
                          ? 'border-[#fcc636]/60 text-[#fcc636]'
                          : 'border-white/10 text-white/70 hover:border-[#fcc636]/40'
                      }`}
                    >
                      {suggestedJobId === job.id ? 'Hide matches' : 'AI matches'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onGoToBulkUpload(job.id)}
                      className="px-3 py-2 rounded-lg border border-white/10 text-white/70 text-xs font-bold hover:border-[#fcc636]/40 bg-[#fcc636]/5"
                    >
                      Bulk Upload Resumes
                    </button>
                    <button type="button" onClick={() => startEdit(job)} className="px-3 py-2 rounded-lg border border-white/10 text-white/70 text-xs font-bold hover:border-[#fcc636]/40">
                      Edit
                    </button>
                    <button type="button" onClick={() => onDuplicateJob(job.id)} className="px-3 py-2 rounded-lg border border-white/10 text-white/70 text-xs font-bold hover:border-[#fcc636]/40">
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateJob(job.id, { status: job.status === 'closed' ? 'active' : 'closed' })}
                      className="px-3 py-2 rounded-lg border border-white/10 text-xs font-bold hover:border-[#fcc636]/40"
                    >
                      {job.status === 'closed' ? 'Reopen' : 'Close'}
                    </button>
                    {limits?.can_feature_jobs && job.status !== 'closed' && (
                      <button
                        type="button"
                        onClick={() => onUpdateJob(job.id, { featured: !job.featured })}
                        className="px-3 py-2 rounded-lg border border-[#fcc636]/30 text-[#fcc636] text-xs font-bold"
                      >
                        {job.featured ? 'Unfeature' : 'Feature'}
                      </button>
                    )}
                  </div>
                </div>
                {suggestedJobId === job.id && (
                  <div className="px-5 pb-5 border-t border-white/5 pt-4">
                    <p className="text-xs font-bold text-white/50 uppercase tracking-wide mb-3">
                      Suggested candidates (by resume match)
                    </p>
                    {suggestedLoading ? (
                      <p className="text-sm text-white/40">Loading matches…</p>
                    ) : suggestedCandidates.length === 0 ? (
                      <p className="text-sm text-white/40">No matching candidates in the pool yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {suggestedCandidates.map((c) => (
                          <div
                            key={c.user_id}
                            onClick={() => setSelectedCandidate(c)}
                            className="cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-[#2b2b2b] border border-white/5 hover:border-[#fcc636]/30 transition-all"
                          >
                            <div className="min-w-0 flex-grow">
                              <p className="text-sm font-bold text-white group-hover:text-[#fcc636] transition-colors">{c.candidate_name}</p>
                              <p className="text-xs text-white/50">{c.candidate_email}</p>
                              {c.resume_title && (
                                <p className="text-xs text-white/40 mt-0.5">{c.resume_title}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="px-2 py-1 rounded bg-[#fcc636]/15 text-[#fcc636] text-xs font-bold">
                                {matchPct(c.match_score)} match
                              </span>
                              {c.already_applied ? (
                                <span className="text-[10px] text-white/40 uppercase">Applied</span>
                              ) : introSentTo.has(c.user_id) ? (
                                <span className="text-[10px] text-white/40 uppercase">Intro sent</span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={introSending === c.user_id}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setIntroSending(c.user_id);
                                    try {
                                      await onRequestIntro(job.id, c.user_id);
                                      setIntroSentTo((prev) => new Set(prev).add(c.user_id));
                                    } catch {
                                      // toast already handled by the caller
                                    } finally {
                                      setIntroSending(null);
                                    }
                                  }}
                                  className="px-2 py-1 rounded bg-white/10 hover:bg-[#fcc636]/20 hover:text-[#fcc636] text-white/70 text-[10px] font-bold uppercase transition-colors disabled:opacity-50"
                                >
                                  {introSending === c.user_id ? 'Sending…' : 'Request intro'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {!limits?.is_premium && (
                      <p className="text-xs text-white/40 mt-3">
                        Free plan shows top matches only.{' '}
                        <Link to="/checkout" className="text-[#fcc636] underline">
                          Upgrade
                        </Link>{' '}
                        for more suggestions.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      {/* Job Details Modal */}
      {selectedJob && (
        <JobDetailModal
          job={jobs.find((j) => j.id === selectedJob.id) || selectedJob}
          isOpen={true}
          onClose={() => setSelectedJob(null)}
          onEdit={() => startEdit(selectedJob)}
          onDuplicate={() => onDuplicateJob(selectedJob.id)}
          onToggleStatus={() =>
            onUpdateJob(selectedJob.id, {
              status: selectedJob.status === 'closed' ? 'active' : 'closed',
            })
          }
        />
      )}
      {selectedCandidate && (
        <CandidateDetailModal
          app={selectedCandidate}
          isOpen={true}
          onClose={() => setSelectedCandidate(null)}
          onStatusChange={() => {}}
        />
      )}
    </div>
  );
}

  return (
    <div className="flex flex-col xl:flex-row gap-8">
      <form onSubmit={handleSubmit} className="flex-grow max-w-2xl space-y-6 p-8 rounded-xl bg-[#1a1a1a] border border-white/10">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">{mode === 'edit' ? 'Edit job' : 'Post a new job'}</h2>
          <button type="button" onClick={resetForm} className="text-sm text-white/50 hover:text-white">Cancel</button>
        </div>

        {mode === 'create' && (
          <div className="flex flex-wrap gap-2">
            {JOB_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setForm({
                  position_title: t.position_title,
                  employment_type: t.employment_type,
                  location: t.location,
                  description: t.description,
                  tags: t.tags,
                  salary_min: '',
                  salary_max: '',
                  salary_currency: 'USD',
                  salary_period: 'yearly',
                  featured: false,
                })}
                className="px-3 py-1.5 rounded-lg border border-[#fcc636]/30 text-[#fcc636] text-xs font-bold hover:bg-[#fcc636]/10"
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm text-white">Job title</label>
          <input
            value={form.position_title}
            onChange={(e) => setForm((f) => ({ ...f, position_title: e.target.value }))}
            className="w-full h-11 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-[#fcc636] outline-none"
            placeholder="Senior Software Engineer"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-white">Location</label>
            <select value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="w-full h-11 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-white/70">
              <option>Remote</option>
              <option>Onsite</option>
              <option>Hybrid</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-white">Employment type</label>
            <select value={form.employment_type} onChange={(e) => setForm((f) => ({ ...f, employment_type: e.target.value }))} className="w-full h-11 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-white/70">
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contractor</option>
              <option>Temporary</option>
              <option>Internship</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <input value={form.salary_min} onChange={(e) => setForm((f) => ({ ...f, salary_min: e.target.value.replace(/\D/g, '') }))} placeholder="Min K" className="w-24 h-11 px-3 rounded-lg bg-[#2b2b2b] border border-white/10 text-[#fcc636]" />
          <span className="text-white/40">–</span>
          <input value={form.salary_max} onChange={(e) => setForm((f) => ({ ...f, salary_max: e.target.value.replace(/\D/g, '') }))} placeholder="Max K" className="w-24 h-11 px-3 rounded-lg bg-[#2b2b2b] border border-white/10 text-[#fcc636]" />
          <select value={form.salary_currency} onChange={(e) => setForm((f) => ({ ...f, salary_currency: e.target.value }))} className="h-11 px-3 rounded-lg bg-[#2b2b2b] border border-white/10 text-[#fcc636]">
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm text-white">Description</label>
            <button type="button" onClick={() => setForm((f) => ({ ...f, description: DEFAULT_JOB_DESC_PLACEHOLDER }))} className="text-xs text-[#fcc636]">Use template</button>
          </div>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={12} className="w-full p-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-white/80 font-mono text-sm" />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-white">Skills / tags</label>
          <input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="React, Node.js" className="w-full h-11 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-white/50" />
        </div>

        {mode === 'edit' && limits?.can_feature_jobs && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
              className="w-4 h-4 accent-[#fcc636]"
            />
            <span className="text-sm text-white/80">Feature this job (boost in public listings)</span>
          </label>
        )}

        <button type="submit" disabled={submitting} className="px-8 py-3 rounded-xl bg-[#fcc636] text-[#2b2b2b] font-bold disabled:opacity-50">
          {submitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Publish job'}
        </button>
      </form>

      <div className="w-full max-w-sm p-6 rounded-xl bg-[#1a1a1a] border border-white/10 h-fit">
        <p className="font-bold text-white mb-2">{form.position_title || 'Job title'}</p>
        <p className="text-sm text-white/50">{form.location} · {form.employment_type}</p>
        {form.featured && limits?.can_feature_jobs && (
          <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#fcc636]/15 text-[#fcc636]">
            Featured
          </span>
        )}
        <p className="text-xs text-white/40 mt-4 line-clamp-8 whitespace-pre-wrap">{form.description || 'Preview…'}</p>
      </div>
    </div>
  );
}
