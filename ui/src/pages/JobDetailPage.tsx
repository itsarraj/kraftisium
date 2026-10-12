import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { bffApi, Job } from '../services/bffApi'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage, notifyError, notifySuccess } from '../lib/toast'
import { buildJobPostingJsonLd } from '../lib/jobPostingSchema'
import { SITE_URL } from '../constants/site'

const JobDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isAuthenticated } = useAuth()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)
  const [applying, setApplying] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    const fetchJob = async (showLoading = true) => {
      if (showLoading) {
        setLoading(true)
        setError(null)
      }
      try {
        const data = await bffApi.getJob(id)
        if (!cancelled) {
          setJob(data)
        }
      } catch {
        if (!cancelled) {
          setError('Job not found')
        }
      } finally {
        if (!cancelled && showLoading) {
          setLoading(false)
        }
      }
    }

    fetchJob()

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchJob(false)
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [id, location.key])

  const jobId = job?.id

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'user' || !user?.id || !jobId) return
    let cancelled = false
    Promise.all([
      bffApi.getMyApplications(user.id),
      bffApi.getSavedJobs(user.id),
    ])
      .then(([apps, savedJobs]) => {
        if (!cancelled) {
          setApplied(apps.some((a) => a.job_id === jobId))
          setSaved(savedJobs.some((j) => j.id === jobId))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApplied(false)
          setSaved(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, jobId, user?.id, user?.role])

  const handleToggleSave = async () => {
    if (!user?.id || !jobId) return
    setSaving(true)
    try {
      if (saved) {
        await bffApi.unsaveJob(user.id, jobId)
        setSaved(false)
        notifySuccess('Removed from saved jobs.')
      } else {
        await bffApi.saveJob(user.id, jobId)
        setSaved(true)
        notifySuccess('Saved to your bookmarks.')
      }
    } catch (e) {
      notifyError(getErrorMessage(e, 'Could not update saved job.'))
    } finally {
      setSaving(false)
    }
  }

  const handleApply = async () => {
    if (!user?.id || !job) return
    setApplying(true)
    try {
      await bffApi.applyToJob(user.id, job.id)
      setApplied(true)
      notifySuccess('Application submitted successfully.')
    } catch (error) {
      const msg = getErrorMessage(error, 'Failed to apply to this job.')
      notifyError(msg)
      if (msg.toLowerCase().includes('resume')) {
        navigate('/profile')
      }
    } finally {
      setApplying(false)
    }
  }

  const formatSalary = (min?: number, max?: number, currency?: string) => {
    if (!min && !max) return 'Salary not disclosed'
    const curr = currency || 'USD'
    if (min && max) return `${(min / 1000).toFixed(0)}-${(max / 1000).toFixed(0)}k ${curr}`
    if (min) return `>${(min / 1000).toFixed(0)}k ${curr}`
    return `<${(max! / 1000).toFixed(0)}k ${curr}`
  }

  const timeAgo = (date: string) => {
    const now = new Date()
    const posted = new Date(date)
    const diffInMs = now.getTime() - posted.getTime()
    const diffInMins = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMins / 60)
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays > 0) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    if (diffInHours > 0) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    return `${diffInMins} min${diffInMins > 1 ? 's' : ''} ago`
  }

  const fromAiMatches =
    (location.state as { from?: string } | null)?.from === '/ai-matches' ||
    searchParams.get('from') === 'ai-matches'
  const fromJobs =
    (location.state as { from?: string } | null)?.from === '/jobs' ||
    searchParams.get('from') === 'jobs'
  const backLink = fromAiMatches
    ? { to: '/ai-matches', label: 'Back to AI Matches' }
    : fromJobs
      ? { to: '/jobs', label: 'Back to Jobs' }
      : { to: '/jobs', label: 'Back to Jobs' }

  if (loading) {
    return (
      <div className="bg-[#2b2b2b] min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#fcc636] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="bg-[#2b2b2b] min-h-screen flex flex-col items-center justify-center gap-6 py-20">
        <p className="text-xl text-white/70">{error || 'Job not found'}</p>
        <Link to={backLink.to} className="px-6 py-3 rounded-lg bg-[#fcc636] text-[#2b2b2b] font-bold hover:bg-[#e6b535] transition-all">
          {backLink.label}
        </Link>
      </div>
    )
  }

  const jobPostingLd = buildJobPostingJsonLd(job)

  return (
    <>
      <Helmet>
        <title>{job.position_title} at {job.company_name} - Kraftisium</title>
        <meta name="description" content={job.description?.slice(0, 160) || `${job.position_title} at ${job.company_name}`} />
        <link rel="canonical" href={`${SITE_URL}/jobs/${job.id}`} />
        {jobPostingLd && (
          <script type="application/ld+json">{JSON.stringify(jobPostingLd)}</script>
        )}
      </Helmet>

      <div className="bg-[#2b2b2b] min-h-screen text-white py-12 px-4 md:px-16">
        <div className="container mx-auto max-w-4xl">
          <Link to={backLink.to} className="inline-flex items-center gap-2 text-white/60 hover:text-[#fcc636] text-sm mb-8 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            {backLink.label}
          </Link>

          <div className="p-8 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-brand space-y-8">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-[#2b2b2b] flex items-center justify-center border border-white/10">
                {job.company_logo_url ? (
                  <img src={job.company_logo_url} alt={job.company_name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <span className="text-3xl font-bold text-[#fcc636]">{job.company_name.charAt(0)}</span>
                )}
              </div>
              <div className="flex-grow">
                <p className="text-lg text-white/70 mb-1">{job.company_name}</p>
                <h1 className="text-3xl font-bold text-white mb-4">{job.position_title}</h1>
                <div className="flex flex-wrap gap-6 text-white/60">
                  <span className="flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {job.location}
                  </span>
                  <span className="flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {timeAgo(job.posted_at)}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#fcc636]/10 text-[#fcc636] text-sm font-medium">{job.employment_type}</span>
                  <span className="flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                  </span>
                </div>
              </div>
              {isAuthenticated && user?.role === 'user' && (
                <div className="flex-shrink-0 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleToggleSave}
                    disabled={saving}
                    className={`p-4 rounded-xl border transition-all ${
                      saved
                        ? 'border-[#fcc636] bg-[#fcc636]/10 text-[#fcc636]'
                        : 'border-white/10 bg-[#2b2b2b] text-white/60 hover:text-white hover:border-white/30'
                    }`}
                    title={saved ? 'Remove from saved' : 'Save job'}
                    aria-label={saved ? 'Remove from saved' : 'Save job'}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill={saved ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={applied || applying}
                    className="px-8 py-4 rounded-xl bg-[#fcc636] text-[#2b2b2b] font-bold shadow-brand hover:bg-[#e6b535] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {applied ? 'Applied' : applying ? 'Applying...' : 'Apply Now'}
                  </button>
                </div>
              )}
            </div>

            <div className="h-px bg-white/10" />

            <div>
              <h2 className="text-lg font-bold text-white mb-4">Job Description</h2>
              <div className="text-white/80 whitespace-pre-wrap leading-relaxed font-mono text-sm">
                {job.description || 'No description available.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default JobDetailPage
