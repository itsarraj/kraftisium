import { useState, useEffect, useMemo, useCallback } from 'react'
import { Helmet } from 'react-helmet'
import { Link } from 'react-router-dom'
import { bffApi, Job } from '../services/bffApi'
import { useAuth } from '../contexts/AuthContext'
import FilterSidebar from '../components/FilterSidebar'
import { JobsFilterState, DEFAULT_JOBS_FILTER } from '../types/filters'
import { filterJobs } from '../utils/filterJobs'
import { getErrorMessage, notifyError, notifySuccess } from '../lib/toast'
import { isUserPremium } from '../types/subscription'
import JobCard from '../components/JobCard'
import JobCardSkeleton from '../components/JobCardSkeleton'
import { formatYearlyPrice, usePricingInfo } from '../hooks/usePricingInfo'
import { useDailyMatchDigest } from '../hooks/useDailyMatchDigest'
import JobDetailModal from '../components/recruiter/JobDetailDrawer'
import ScrollToTop from '../components/ScrollToTop'

const AIMatchesPage = () => {
  const { user, isAuthenticated } = useAuth()
  const [suggestedJobs, setSuggestedJobs] = useState<Job[]>([])
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showReviewed, setShowReviewed] = useState(false)

  const loadMatches = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const [suggested, applications, saved] = await Promise.all([
        bffApi.getSuggestedJobs(user.id),
        bffApi.getMyApplications(user.id),
        bffApi.getSavedJobs(user.id),
      ])
      setSuggestedJobs(suggested)
      setAppliedJobIds(new Set(applications.map((a) => a.job_id)))
      setSavedJobIds(new Set(saved.map((j) => j.id)))
    } catch (error) {
      console.error('Failed to fetch suggested jobs:', error)
      notifyError(getErrorMessage(error, 'Failed to load AI matches.'), {
        id: 'ai-matches-load',
      })
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user?.id])

  const handleToggleSave = async (jobId: string) => {
    if (!user?.id) return
    const isSaved = savedJobIds.has(jobId)
    try {
      if (isSaved) {
        await bffApi.unsaveJob(user.id, jobId)
        setSavedJobIds((prev) => {
          const next = new Set(prev)
          next.delete(jobId)
          return next
        })
        notifySuccess('Removed from saved jobs.')
      } else {
        await bffApi.saveJob(user.id, jobId)
        setSavedJobIds((prev) => new Set(prev).add(jobId))
        notifySuccess('Saved to your bookmarks.')
      }
    } catch (e) {
      notifyError(getErrorMessage(e, 'Could not update saved job.'))
    }
  }

  useEffect(() => {
    loadMatches()
  }, [loadMatches])

  const handleRefreshMatches = async () => {
    if (!user?.id) return
    setIsRefreshing(true)
    try {
      await bffApi.refreshSuggestedJobs(user.id)
      notifySuccess('Updating your matches — this may take a moment.')
      await new Promise((r) => setTimeout(r, 2500))
      await loadMatches()
      await new Promise((r) => setTimeout(r, 2000))
      await loadMatches()
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to refresh AI matches.'))
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleApply = async (jobId: string) => {
    if (!user?.id) return
    try {
      await bffApi.applyToJob(user.id, jobId)
      setAppliedJobIds((prev) => new Set([...prev, jobId]))
      notifySuccess('Application submitted successfully.')
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to apply to this job.'))
    }
  }

  const [filter, setFilter] = useState<JobsFilterState>(DEFAULT_JOBS_FILTER)
  const filteredSuggested = useMemo(() => filterJobs(suggestedJobs, filter), [suggestedJobs, filter])
  const isPremium = isUserPremium(user?.subscription)
  const { yearlyPrice, freeMatchLimit } = usePricingInfo()
  const freeLimit = freeMatchLimit ?? 0
  const displayedJobs = isPremium ? filteredSuggested : filteredSuggested.slice(0, freeLimit)
  const totalMatches = filteredSuggested.length
  const hiddenCount = isPremium ? 0 : Math.max(0, totalMatches - freeLimit)
  const { todaysMatches, reviewedMatches } = useDailyMatchDigest(user?.id, displayedJobs)

  return (
    <>
      <Helmet>
        <title>AI Job Matches - Kraftisium</title>
        <meta name="description" content="Unlock your personalized AI job matches on Kraftisium." />
      </Helmet>

      <div className="min-h-screen bg-[#2b2b2b] text-white py-12 px-4 md:px-16">
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row gap-12 items-start">

            <div className="w-full lg:w-80 space-y-6 shrink-0">
              <div className="p-8 rounded-2xl bg-[#1a1a1a] border border-[#fcc636]/20 shadow-brand space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#fcc636]/5 rounded-full -mr-16 -mt-16 blur-2xl" />

                <div className="space-y-4 relative z-10">
                  <h2 className="text-2xl font-bold text-white">AI Analysis</h2>
                  <p className="text-sm text-white/50 leading-relaxed">
                    We narrow jobs by your resume keywords, then rank the best fits with semantic matching (no LLM).
                  </p>
                </div>

                <div className="h-px bg-white/10" />

                <div className="space-y-4 relative z-10">
                  <h3 className="text-sm font-bold text-[#fcc636] uppercase tracking-widest">Your Stats</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-[#2b2b2b] border border-white/5">
                      <p className="text-2xl font-bold text-white">{totalMatches}</p>
                      <p className="text-[10px] text-white/40 uppercase">Matches</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#2b2b2b] border border-white/5">
                      <p className="text-2xl font-bold text-white">{suggestedJobs.length > 0 ? 'Live' : '—'}</p>
                      <p className="text-[10px] text-white/40 uppercase">Status</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshMatches}
                  disabled={isRefreshing || isLoading}
                  className="w-full py-3 rounded-xl bg-[#fcc636] text-[#2b2b2b] font-bold shadow-brand hover:bg-[#e6b535] transition-all disabled:opacity-50"
                >
                  {isRefreshing ? 'Refreshing…' : 'Refresh matches'}
                </button>
              </div>

              <FilterSidebar filter={filter} onChange={setFilter} />
            </div>

            <div className="flex-grow w-full space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                    ✨ AI Matches
                  </h1>
                  <p className="text-white/50">Jobs ranked for your resume after keyword prefilter + embedding similarity.</p>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshMatches}
                  disabled={isRefreshing}
                  className="px-6 py-3 rounded-xl border border-[#fcc636]/40 text-[#fcc636] font-bold hover:bg-[#fcc636]/10 disabled:opacity-50"
                >
                  {isRefreshing ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>

              {!isPremium && totalMatches > 0 && (
                <div className="rounded-xl border border-[#fcc636]/30 bg-[#1a1a1a] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-white">
                      Showing {displayedJobs.length} of {totalMatches} matches
                    </p>
                    <p className="text-sm text-white/50 mt-1">
                      Free plan includes {freeLimit} AI matches. Upgrade to Yearly Premium ({formatYearlyPrice(yearlyPrice)}/yr) for unlimited matches.
                    </p>
                  </div>
                  <Link
                    to="/upgrade"
                    className="shrink-0 px-6 py-3 rounded-xl bg-[#fcc636] text-[#2b2b2b] font-bold shadow-brand hover:bg-[#e6b535]"
                  >
                    Upgrade
                  </Link>
                </div>
              )}

              <div className="flex flex-col gap-6">
                {isLoading && suggestedJobs.length === 0 ? (
                  <>
                    {[...Array(4)].map((_, i) => (
                      <JobCardSkeleton key={`skeleton-${i}`} />
                    ))}
                  </>
                ) : todaysMatches.length > 0 ? (
                  <>
                    {todaysMatches.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        detailTo={`/jobs/${job.id}`}
                        linkState={{ from: '/ai-matches' }}
                        className="p-8 rounded-xl"
                        onApply={isAuthenticated && user?.role === 'user' ? handleApply : undefined}
                        applied={appliedJobIds.has(job.id)}
                        saved={savedJobIds.has(job.id)}
                        onToggleSave={isAuthenticated && user?.role === 'user' ? handleToggleSave : undefined}
                        onClick={() => setSelectedJob(job)}
                      />
                    ))}

                    <div className="text-center py-10 px-6 bg-[#1a1a1a] rounded-xl border border-white/10 shadow-brand space-y-3">
                      <p className="text-lg font-bold text-white">You're all caught up ✓</p>
                      <p className="text-sm text-white/50 max-w-md mx-auto">
                        That's today's top {todaysMatches.length} match{todaysMatches.length === 1 ? '' : 'es'}. We'll
                        surface a fresh batch tomorrow, or update your resume and refresh to re-rank now.
                      </p>
                    </div>

                    {reviewedMatches.length > 0 && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setShowReviewed((v) => !v)}
                          className="text-sm text-white/50 hover:text-[#fcc636] transition-colors"
                        >
                          {showReviewed ? 'Hide' : 'Show'} {reviewedMatches.length} previously reviewed match
                          {reviewedMatches.length === 1 ? '' : 'es'} {showReviewed ? '▲' : '▼'}
                        </button>
                        {showReviewed && (
                          <div className="flex flex-col gap-6 mt-4">
                            {reviewedMatches.map((job) => (
                              <JobCard
                                key={job.id}
                                job={job}
                                detailTo={`/jobs/${job.id}`}
                                linkState={{ from: '/ai-matches' }}
                                className="p-8 rounded-xl opacity-80"
                                onApply={isAuthenticated && user?.role === 'user' ? handleApply : undefined}
                                applied={appliedJobIds.has(job.id)}
                                saved={savedJobIds.has(job.id)}
                                onToggleSave={isAuthenticated && user?.role === 'user' ? handleToggleSave : undefined}
                                onClick={() => setSelectedJob(job)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : null}

                {!isPremium && displayedJobs.length > 0 && (
                  <div className="relative overflow-hidden rounded-2xl border border-[#fcc636]/30 bg-[#1a1a1a] p-8 md:p-10 shadow-brand">
                    <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-[#fcc636]/10 blur-3xl" />
                    <div className="relative z-10 space-y-6">
                      {hiddenCount > 0 && (
                        <div className="space-y-3">
                          {Array.from({ length: Math.min(hiddenCount, 3) }).map((_, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-4 rounded-xl border border-white/5 bg-[#2b2b2b]/80 p-5 blur-[2px] select-none pointer-events-none"
                              aria-hidden
                            >
                              <div className="h-14 w-14 shrink-0 rounded-xl bg-white/5" />
                              <div className="min-w-0 flex-grow space-y-2">
                                <div className="h-3 w-24 rounded bg-white/10" />
                                <div className="h-4 w-48 rounded bg-white/10" />
                                <div className="h-3 w-32 rounded bg-white/5" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="text-center space-y-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-[#fcc636]">Yearly Premium</p>
                        <h2 className="text-2xl md:text-3xl font-bold text-white">
                          {hiddenCount > 0
                            ? `Unlock ${hiddenCount} more AI match${hiddenCount === 1 ? '' : 'es'}`
                            : 'Get unlimited AI matches'}
                        </h2>
                        <p className="mx-auto max-w-lg text-sm text-white/50 leading-relaxed">
                          {hiddenCount > 0
                            ? `We found ${totalMatches} jobs ranked for your resume. Your free plan shows ${freeLimit} — upgrade to see every match and apply without limits.`
                            : `Your free plan includes ${freeLimit} AI matches. Upgrade to unlock unlimited matches, full ranking, and priority refresh when you update your resume.`}
                        </p>
                      </div>

                      <ul className="mx-auto max-w-md space-y-2 text-sm text-white/70">
                        <li className="flex items-center gap-2">
                          <span className="text-[#fcc636]">✓</span> Unlimited AI job matches
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-[#fcc636]">✓</span> Full semantic ranking on your resume
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-[#fcc636]">✓</span> Priority refresh when you update your profile
                        </li>
                      </ul>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <Link
                          to={isAuthenticated ? '/checkout' : '/register'}
                          className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#fcc636] text-[#2b2b2b] font-bold shadow-brand hover:bg-[#e6b535] transition-all text-center"
                        >
                          Upgrade — {formatYearlyPrice(yearlyPrice)}/yr
                        </Link>
                        <Link
                          to="/upgrade"
                          className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/20 text-white font-bold hover:border-[#fcc636]/40 transition-all text-center"
                        >
                          See all benefits
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {!isLoading && displayedJobs.length === 0 ? (
                  <div className="text-center py-20 bg-[#1a1a1a] rounded-lg border border-white/10 shadow-brand space-y-6">
                    <p className="text-lg text-white/50">No AI matches yet.</p>
                    <p className="text-sm text-white/40 max-w-md mx-auto">
                      Upload your resume on your profile, then refresh matches. We use keyword search to find candidates, then rank them with embeddings.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                      <Link
                        to="/profile"
                        className="px-8 py-3 rounded-xl bg-[#fcc636] text-[#2b2b2b] font-bold shadow-brand hover:bg-[#e6b535]"
                      >
                        Upload resume
                      </Link>
                      <button
                        type="button"
                        onClick={handleRefreshMatches}
                        disabled={isRefreshing}
                        className="px-8 py-3 rounded-xl border border-white/20 text-white font-bold hover:border-[#fcc636]/40 disabled:opacity-50"
                      >
                        {isRefreshing ? 'Refreshing…' : 'Refresh matches'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

          </div>
        </div>
      </div>
      {/* Job Details Modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          isOpen={true}
          onClose={() => setSelectedJob(null)}
          onApply={
            isAuthenticated && user?.role === 'user'
              ? () => {
                  void handleApply(selectedJob.id)
                }
              : undefined
          }
          applied={appliedJobIds.has(selectedJob.id)}
        />
      )}
      <ScrollToTop />
    </>
  )
}

export default AIMatchesPage
