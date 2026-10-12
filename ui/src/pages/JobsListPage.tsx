import { useState, useEffect, useMemo, FormEvent, useRef, useCallback } from 'react'
import { Helmet } from 'react-helmet'
import { useSearchParams } from 'react-router-dom'
import { bffApi, Job } from '../services/bffApi'
import { useAuth } from '../contexts/AuthContext'
import JobCard from '../components/JobCard'
import JobCardSkeleton from '../components/JobCardSkeleton'
import JobDetailModal from '../components/recruiter/JobDetailDrawer'
import FilterSidebar from '../components/FilterSidebar'
import { JobsFilterState, DEFAULT_JOBS_FILTER } from '../types/filters'
import { getErrorMessage, notifyError, notifySuccess } from '../lib/toast'
import { filterJobs } from '../utils/filterJobs'
import ScrollToTop from '../components/ScrollToTop'

const PAGE_SIZE = 12
// Infinite scroll stops auto-loading past this many pages (120 results) and
// asks the user to narrow the search instead of growing the DOM forever.
const MAX_AUTO_LOAD_PAGES = 10

const JobsListPage = () => {
  const { user, isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const urlQuery = searchParams.get('q') ?? ''
  const urlLocation = searchParams.get('location') ?? ''

  const [searchInput, setSearchInput] = useState(urlQuery)
  const [locationInput, setLocationInput] = useState(urlLocation)
  const [jobs, setJobs] = useState<Job[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<JobsFilterState>(DEFAULT_JOBS_FILTER)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  const observer = useRef<IntersectionObserver | null>(null)
  const lastJobElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && currentPage < totalPages && currentPage < MAX_AUTO_LOAD_PAGES) {
        setCurrentPage((prev) => prev + 1)
      }
    })
    if (node) observer.current.observe(node)
  }, [isLoading, currentPage, totalPages])

  useEffect(() => {
    setSearchInput(urlQuery)
    setLocationInput(urlLocation)
  }, [urlQuery, urlLocation])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'user') {
      bffApi.getMyApplications(user.id).then((apps) => {
        setAppliedJobIds(new Set(apps.map((a) => a.job_id)))
      }).catch(() => {})
      bffApi.getSavedJobs(user.id).then((savedJobs) => {
        setSavedJobIds(new Set(savedJobs.map((j) => j.id)))
      }).catch(() => {})
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    setCurrentPage(1)
    setJobs([])
  }, [urlQuery, urlLocation])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const res = await bffApi.searchJobs({
          q: urlQuery || undefined,
          location: urlLocation || undefined,
          page: currentPage,
          limit: PAGE_SIZE,
        })
        if (currentPage === 1) {
          setJobs(res.jobs)
        } else {
          setJobs((prev) => [...prev, ...res.jobs])
        }
        setTotalCount(res.total_count)
        setTotalPages(Math.max(1, res.total_pages))
      } catch (error) {
        console.error('Failed to search jobs:', error)
        notifyError(getErrorMessage(error, 'Failed to search jobs.'), { id: 'jobs-search-load' })
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [urlQuery, urlLocation, currentPage])

  const filteredJobs = useMemo(() => filterJobs(jobs, filter), [jobs, filter])

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
      } else {
        await bffApi.saveJob(user.id, jobId)
        setSavedJobIds((prev) => new Set([...prev, jobId]))
      }
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to update saved job.'))
    }
  }

  const canUseCandidateActions = isAuthenticated && user?.role === 'user'

  const applySearch = () => {
    const params = new URLSearchParams()
    const q = searchInput.trim()
    const loc = locationInput.trim()
    if (q) params.set('q', q)
    if (loc) params.set('location', loc)
    setSearchParams(params)
  }

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault()
    applySearch()
  }

  const hasActiveSearch = Boolean(urlQuery.trim() || urlLocation.trim())

  return (
    <>
      <Helmet>
        <title>Jobs List - Kraftisium</title>
        <meta name="description" content="Browse and search job opportunities on Kraftisium." />
      </Helmet>

      <div className="bg-[#2b2b2b] min-h-screen text-white py-12 px-4 md:px-16">
        <div className="container mx-auto">
          <div className="flex justify-start items-start gap-8">
            <div className="md:hidden fixed top-20 right-4 z-40">
              <button
                type="button"
                onClick={() => setSidebarOpen((o) => !o)}
                className="flex justify-between items-center w-[200px] p-3 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-brand cursor-pointer group"
              >
                <span className="text-base text-white group-hover:text-[#fcc636] transition-colors">Filter by</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-white/50">
                  <path fillRule="evenodd" clipRule="evenodd" d="M2.64645 5.64645C2.84171 5.45118 3.15829 5.45118 3.35355 5.64645L8 10.2929L12.6464 5.64645C12.8417 5.45118 13.1583 5.45118 13.3536 5.64645C13.5488 5.84171 13.5488 6.15829 13.3536 6.35355L8.35355 11.3536C8.15829 11.5488 7.84171 11.5488 7.64645 11.3536L2.64645 6.35355Z" fill="currentColor" />
                </svg>
              </button>
            </div>

            {sidebarOpen && (
              <>
                <div
                  className="md:hidden fixed inset-0 bg-black/50 z-40"
                  onClick={() => setSidebarOpen(false)}
                  aria-hidden
                />
                <div className="md:hidden fixed top-0 left-0 z-50 pt-16">
                  <FilterSidebar
                    filter={filter}
                    onChange={setFilter}
                    onClose={() => setSidebarOpen(false)}
                    isMobileOverlay
                  />
                </div>
              </>
            )}

            <div className="hidden md:block flex-shrink-0">
              <FilterSidebar filter={filter} onChange={setFilter} />
            </div>

            <div className="flex flex-col justify-start items-center flex-grow gap-8 w-full min-w-0">
              <form
                onSubmit={handleSearchSubmit}
                className="w-full flex flex-col sm:flex-row gap-2 p-3 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-brand"
              >
                <div className="flex flex-grow items-center gap-2 px-3 py-2 rounded-lg bg-[#2b2b2b] border border-white/5">
                  <svg className="w-5 h-5 text-[#fcc636] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Job title, company, skills..."
                    className="flex-grow bg-transparent outline-none text-white placeholder-white/40 text-sm"
                  />
                </div>
                <div className="flex sm:w-48 items-center gap-2 px-3 py-2 rounded-lg bg-[#2b2b2b] border border-white/5">
                  <svg className="w-5 h-5 text-[#fcc636] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="Location"
                    className="flex-grow bg-transparent outline-none text-white placeholder-white/40 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#fcc636] text-[#2b2b2b] font-bold text-sm hover:bg-[#e6b535] transition-colors shrink-0"
                >
                  Search
                </button>
              </form>

              <div className="flex flex-col justify-start items-start self-stretch gap-4 w-full">
                <div className="flex flex-wrap justify-between items-center self-stretch gap-2">
                  <p className="text-2xl md:text-[32px] font-bold text-white">
                    {totalCount.toLocaleString('en-IN')} {hasActiveSearch ? 'results' : 'jobs'}
                  </p>
                  {hasActiveSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput('')
                        setLocationInput('')
                        setSearchParams({})
                      }}
                      className="text-sm text-[#fcc636] hover:underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-4 w-full">
                  {isLoading && currentPage === 1 ? (
                    <>
                      {[...Array(4)].map((_, i) => (
                        <JobCardSkeleton key={`skeleton-${i}`} />
                      ))}
                    </>
                  ) : filteredJobs.length > 0 ? (
                    <>
                      {filteredJobs.map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          detailTo={`/jobs/${job.id}`}
                          linkState={{ from: '/jobs' }}
                          onApply={canUseCandidateActions ? handleApply : undefined}
                          applied={appliedJobIds.has(job.id)}
                          onClick={() => setSelectedJob(job)}
                          saved={savedJobIds.has(job.id)}
                          onToggleSave={canUseCandidateActions ? handleToggleSave : undefined}
                        />
                      ))}
                      {currentPage < totalPages && currentPage < MAX_AUTO_LOAD_PAGES && (
                        <div ref={lastJobElementRef} className="w-full flex flex-col gap-4 pt-4">
                          {[...Array(2)].map((_, i) => (
                            <JobCardSkeleton key={`skeleton-append-${i}`} />
                          ))}
                        </div>
                      )}
                      {currentPage < totalPages && currentPage >= MAX_AUTO_LOAD_PAGES && (
                        <div className="text-center py-8 bg-[#1a1a1a] rounded-lg border border-white/10 shadow-brand">
                          <p className="text-white/70">
                            Showing the first {jobs.length.toLocaleString('en-IN')} of{' '}
                            {totalCount.toLocaleString('en-IN')} results.
                          </p>
                          <p className="text-sm text-white/50 mt-1">
                            Refine your search or filters to find what you're looking for faster.
                          </p>
                          <button
                            type="button"
                            onClick={() => setCurrentPage((prev) => prev + 1)}
                            disabled={isLoading}
                            className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-accent px-6 py-2.5 font-bold text-brand-bg shadow-brand transition-all hover:bg-brand-accentHover active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoading ? 'Loading…' : 'Load more'}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-20 bg-[#1a1a1a] rounded-lg border border-white/10 shadow-brand">
                      <p className="text-lg text-white/50">No jobs found matching your criteria.</p>
                    </div>
                  )}
                </div>
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
            canUseCandidateActions
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

export default JobsListPage
