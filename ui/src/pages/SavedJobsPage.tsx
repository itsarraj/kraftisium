import { useState, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet'
import { Link } from 'react-router-dom'
import { bffApi, Job } from '../services/bffApi'
import { useAuth } from '../contexts/AuthContext'
import JobCard from '../components/JobCard'
import JobCardSkeleton from '../components/JobCardSkeleton'
import JobDetailModal from '../components/recruiter/JobDetailDrawer'
import { getErrorMessage, notifyError, notifySuccess } from '../lib/toast'
import ScrollToTop from '../components/ScrollToTop'

const SavedJobsPage = () => {
  const { user } = useAuth()
  const [savedJobs, setSavedJobs] = useState<Job[]>([])
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  const load = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const [saved, applications] = await Promise.all([
        bffApi.getSavedJobs(user.id),
        bffApi.getMyApplications(user.id),
      ])
      setSavedJobs(saved)
      setAppliedJobIds(new Set(applications.map((a) => a.job_id)))
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to load saved jobs.'), { id: 'saved-jobs-load' })
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    load()
  }, [load])

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

  const handleUnsave = async (jobId: string) => {
    if (!user?.id) return
    try {
      await bffApi.unsaveJob(user.id, jobId)
      setSavedJobs((prev) => prev.filter((j) => j.id !== jobId))
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to unsave job.'))
    }
  }

  return (
    <>
      <Helmet>
        <title>Saved Jobs - Kraftisium</title>
        <meta name="description" content="Jobs you've saved to review or apply to later on Kraftisium." />
      </Helmet>

      <div className="min-h-screen bg-[#2b2b2b] text-white py-12 px-4 md:px-16">
        <div className="container mx-auto max-w-4xl space-y-8">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-white">Saved jobs</h1>
            <p className="text-white/50">Jobs you've bookmarked to come back to.</p>
          </div>

          <div className="flex flex-col gap-4">
            {isLoading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <JobCardSkeleton key={`skeleton-${i}`} />
                ))}
              </>
            ) : savedJobs.length > 0 ? (
              savedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  detailTo={`/jobs/${job.id}`}
                  linkState={{ from: '/saved-jobs' }}
                  onApply={handleApply}
                  applied={appliedJobIds.has(job.id)}
                  onClick={() => setSelectedJob(job)}
                  saved={true}
                  onToggleSave={handleUnsave}
                />
              ))
            ) : (
              <div className="text-center py-20 bg-[#1a1a1a] rounded-lg border border-white/10 shadow-brand">
                <p className="text-lg text-white/50">No saved jobs yet.</p>
                <Link to="/jobs" className="inline-block mt-4 text-[#fcc636] hover:underline">
                  Browse jobs
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          isOpen={true}
          onClose={() => setSelectedJob(null)}
          onApply={() => {
            void handleApply(selectedJob.id)
          }}
          applied={appliedJobIds.has(selectedJob.id)}
        />
      )}
      <ScrollToTop />
    </>
  )
}

export default SavedJobsPage
