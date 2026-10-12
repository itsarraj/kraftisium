import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { Link } from 'react-router-dom'
import { bffApi, Job, Stats } from '../services/bffApi'
import { useAuth } from '../contexts/AuthContext'
import HeroSearch from '../components/HeroSearch'
import JobCard from '../components/JobCard'
import { getErrorMessage, notifyError, notifySuccess } from '../lib/toast'
import JobDetailModal from '../components/recruiter/JobDetailDrawer'

const formatNumber = (n: number): string => n.toLocaleString('en-IN')

const TESTIMONIALS = [
  { quote: 'Uploaded my resume and got matched with relevant roles in days. The AI really understands my skills. Landed an offer at a startup I love.', name: 'Alex K.', role: 'Software Engineer', rating: 5 },
  { quote: 'As a recruiter, we post jobs here and the quality of applicants is much better. Candidates are pre-matched to our requirements.', name: 'Sarah M.', role: 'Hiring Manager', rating: 5 },
  { quote: 'Simple, fast, and the AI suggestions were spot-on. I applied to 3 jobs and got 2 interviews. Highly recommend.', name: 'Priya R.', role: 'Product Designer', rating: 5 },
  { quote: 'The AI matching cut my job search time in half. I saved so many hours not scrolling through irrelevant postings. Got an offer within three weeks.', name: 'James T.', role: 'Data Analyst', rating: 5 },
  { quote: "Good match quality and the resume feedback was genuinely useful. Would love to see more marketing-specific roles outside the big cities though — most of my matches were concentrated in one or two metros.", name: 'Meera S.', role: 'Marketing Manager', rating: 4 },
  { quote: "The matching itself is solid and I did land interviews, but a few listings were missing salary or seniority info, so I wasted time applying to roles that weren't the right fit. Notifications could be faster too — I found out about a great match two days late.", name: 'Daniel O.', role: 'Backend Developer', rating: 3 },
]

const AVERAGE_RATING = TESTIMONIALS.reduce((sum, t) => sum + t.rating, 0) / TESTIMONIALS.length

const StarIcon = ({ fill = 1 }: { fill?: number }) => {
  const id = `star-clip-${Math.round(fill * 100)}`
  return (
    <svg width="20" height="20" viewBox="0 0 28 28" fill="none" className="w-5 h-5 shrink-0">
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width={28 * fill} height="28" />
        </clipPath>
      </defs>
      <path
        d="M12.9241 4.51345C13.3643 3.62165 14.636 3.62165 15.0762 4.51345L17.3262 9.07174C17.5009 9.42555 17.8383 9.6709 18.2287 9.72797L23.2623 10.4637C24.2462 10.6075 24.6383 11.8169 23.926 12.5107L20.2856 16.0564C20.0026 16.3321 19.8734 16.7295 19.9402 17.1189L20.7991 22.1266C20.9672 23.107 19.9382 23.8546 19.0578 23.3916L14.5587 21.0256C14.209 20.8417 13.7913 20.8417 13.4416 21.0256L8.94252 23.3916C8.06217 23.8546 7.03311 23.107 7.20125 22.1266L8.06013 17.1189C8.12693 16.7295 7.99773 16.3321 7.71468 16.0564L4.07431 12.5107C3.362 11.8169 3.75414 10.6075 4.73804 10.4637L9.7716 9.72797C10.162 9.6709 10.4995 9.42555 10.6741 9.07174L12.9241 4.51345Z"
        fill="currentColor"
        className="text-white/15"
      />
      <path
        d="M12.9241 4.51345C13.3643 3.62165 14.636 3.62165 15.0762 4.51345L17.3262 9.07174C17.5009 9.42555 17.8383 9.6709 18.2287 9.72797L23.2623 10.4637C24.2462 10.6075 24.6383 11.8169 23.926 12.5107L20.2856 16.0564C20.0026 16.3321 19.8734 16.7295 19.9402 17.1189L20.7991 22.1266C20.9672 23.107 19.9382 23.8546 19.0578 23.3916L14.5587 21.0256C14.209 20.8417 13.7913 20.8417 13.4416 21.0256L8.94252 23.3916C8.06217 23.8546 7.03311 23.107 7.20125 22.1266L8.06013 17.1189C8.12693 16.7295 7.99773 16.3321 7.71468 16.0564L4.07431 12.5107C3.362 11.8169 3.75414 10.6075 4.73804 10.4637L9.7716 9.72797C10.162 9.6709 10.4995 9.42555 10.6741 9.07174L12.9241 4.51345Z"
        fill="currentColor"
        className="text-[#fcc636]"
        clipPath={`url(#${id})`}
      />
    </svg>
  )
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((k) => (
      <StarIcon key={k} fill={Math.max(0, Math.min(1, rating - (k - 1)))} />
    ))}
  </div>
)

const HomePage = () => {
  const { user, isAuthenticated } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [suggestedJobs, setSuggestedJobs] = useState<Job[]>([])
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  useEffect(() => {
    bffApi.getStats().then(setStats).catch(() => {})
  }, [])

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setIsLoading(true)
        const jobsResponse = await bffApi.getJobs()
        setJobs(jobsResponse.jobs)

        if (isAuthenticated && user && user.role === 'user') {
          const [suggested, applications] = await Promise.all([
            bffApi.getSuggestedJobs(user.id),
            bffApi.getMyApplications(user.id),
          ])
          setSuggestedJobs(suggested)
          setAppliedJobIds(new Set(applications.map((a) => a.job_id)))
        }
      } catch (error) {
        console.error('Failed to fetch jobs:', error)
        notifyError(getErrorMessage(error, 'Failed to load jobs.'), {
          id: 'home-load-jobs',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchJobs()
  }, [isAuthenticated, user])

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

  const isCandidate = isAuthenticated && user?.role === 'user'
  const displayJobs = isCandidate ? suggestedJobs : jobs

  const renderFeaturedJobs = () => {
    if (isCandidate && displayJobs.length === 0) {
      return (
        <div className="md:col-span-2 p-12 rounded-xl bg-[#1a1a1a] border border-white/10 text-center">
          <p className="text-white/60 mb-4">Upload your resume in Profile to get personalized AI job matches.</p>
          <Link to="/profile" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#fcc636] text-[#2b2b2b] font-bold shadow-brand hover:bg-[#e6b535] transition-all">
            Go to Profile
          </Link>
        </div>
      )
    }
    if (!isCandidate && displayJobs.length === 0) {
      return (
        <div className="md:col-span-2 p-12 rounded-xl bg-[#1a1a1a] border border-white/10 text-center">
          <p className="text-white/60 mb-4">No jobs available right now. Check back later.</p>
        </div>
      )
    }
    return displayJobs.slice(0, 4).map((job) => (
      <JobCard
        key={`featured-${job.id}`}
        job={job}
        detailTo={`/jobs/${job.id}`}
        className="p-8 rounded-xl"
        topBadge={isCandidate ? 'AI Match' : undefined}
        onApply={isCandidate ? handleApply : undefined}
        applied={appliedJobIds.has(job.id)}
        onClick={() => setSelectedJob(job)}
      />
    ))
  }

  return (
    <>
      <Helmet>
        <title>Kraftisium - AI-Powered Resume Job Matching</title>
        <meta name="description" content="Find your dream job with AI-powered resume matching. Upload your resume and get matched with relevant job opportunities instantly." />
        <meta name="keywords" content="resume matching, job search, AI recruitment, career platform" />
      </Helmet>

      <div className="bg-[#2b2b2b] min-h-screen text-white">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-[#1a1a1a] px-4 md:px-16 py-20 border-b border-white/10">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#fcc636 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
          </div>
          
          <div className="container mx-auto relative z-10">
            <HeroSearch />
            
            {/* Stats Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mt-16">
              <div className="flex justify-start items-center gap-5 p-5 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-brand hover:border-[#fcc636]/30 transition-all h-full min-h-[120px]">
                <div className="flex justify-start items-start flex-shrink-0 p-4 rounded bg-[#fcc636]/10">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="w-10 h-10 text-[#fcc636]">
                    <path d="M33.75 11.25H6.25C5.56 11.25 5 11.81 5 12.5V32.5C5 33.19 5.56 33.75 6.25 33.75H33.75C34.44 33.75 35 33.19 35 32.5V12.5C35 11.81 34.44 11.25 33.75 11.25Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M26.25 11.25V8.75C26.25 8.09 25.99 7.45 25.52 6.98C25.05 6.51 24.41 6.25 23.75 6.25H16.25C15.59 6.25 14.95 6.51 14.48 6.98C14.01 7.45 13.75 8.09 13.75 8.75V11.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M35 19.74C30.44 22.37 25.27 23.76 20 23.75C14.73 23.76 9.56 22.37 5 19.74" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M18.125 18.75H21.875" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex flex-col justify-start items-start gap-1 min-w-0">
                  <p className="text-2xl font-bold text-white">{stats ? formatNumber(stats.live_jobs) : '—'}</p>
                  <p className="text-sm text-white/50">Live Job</p>
                </div>
              </div>

              <div className="flex justify-start items-center gap-5 p-5 rounded-xl bg-[#fcc636] border border-[#fcc636] shadow-brand hover:bg-[#e6b535] transition-all h-full min-h-[120px]">
                <div className="flex justify-start items-start flex-shrink-0 p-4 rounded bg-[#2b2b2b]">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="w-10 h-10 text-[#fcc636]">
                    <path d="M2.5 33.75H37.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M22.5 33.75V6.25C22.5 5.56 21.94 5 21.25 5H6.25C5.56 5 5 5.56 5 6.25V33.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M34.999 33.7473V16.2473C34.999 15.9158 34.8673 15.5979 34.6329 15.3634C34.3984 15.129 34.0805 14.9973 33.749 14.9973H22.499" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 11.25H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12.5 21.25H17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9.99896 27.4974H14.999" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex flex-col justify-start items-start gap-1 min-w-0">
                  <p className="text-2xl font-bold text-[#2b2b2b]">{stats ? formatNumber(stats.companies) : '—'}</p>
                  <p className="text-sm text-[#2b2b2b]/70 font-bold uppercase tracking-tight">Companies</p>
                </div>
              </div>

              <div className="flex justify-start items-center gap-5 p-5 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-brand hover:border-[#fcc636]/30 transition-all h-full min-h-[120px]">
                <div className="flex justify-start items-start flex-shrink-0 p-4 rounded bg-[#fcc636]/10">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="w-10 h-10 text-[#fcc636]">
                    <circle cx="13.75" cy="16.875" r="8.125" stroke="currentColor" strokeWidth="2" />
                    <path d="M24.28 9.05C25.4 8.74 26.57 8.67 27.72 8.84C28.87 9.02 29.96 9.44 30.94 10.07C31.91 10.71 32.73 11.55 33.35 12.53C33.97 13.51 34.38 14.61 34.54 15.76" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2.5 30.84C3.77 29.04 5.45 27.57 7.41 26.55C9.37 25.53 11.54 25 13.75 25C15.96 25 18.13 25.53 20.09 26.55C22.05 27.56 23.73 29.04 25 30.84" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M26.49 25C28.69 25 30.87 25.53 32.83 26.55C34.79 27.56 36.47 29.04 37.74 30.84" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex flex-col justify-start items-start gap-1 min-w-0">
                  <p className="text-2xl font-bold text-white">{stats ? formatNumber(stats.candidates) : '—'}</p>
                  <p className="text-sm text-white/50">Candidates</p>
                </div>
              </div>

              <div className="flex justify-start items-center gap-5 p-5 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-brand hover:border-[#fcc636]/30 transition-all h-full min-h-[120px]">
                <div className="flex justify-start items-start flex-shrink-0 p-4 rounded bg-[#fcc636]/10">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="w-10 h-10 text-[#fcc636]">
                    <path d="M33.75 11.25H6.25C5.56 11.25 5 11.81 5 12.5V32.5C5 33.19 5.56 33.75 6.25 33.75H33.75C34.44 33.75 35 33.19 35 32.5V12.5C35 11.81 34.44 11.25 33.75 11.25Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M26.25 11.25V8.75C26.25 8.09 25.99 7.45 25.52 6.98C25.05 6.51 24.41 6.25 23.75 6.25H16.25C15.59 6.25 14.95 6.51 14.48 6.98C14.01 7.45 13.75 8.09 13.75 8.75V11.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M35 19.74C30.44 22.37 25.27 23.76 20 23.75C14.73 23.76 9.56 22.37 5 19.74" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M18.125 18.75H21.875" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex flex-col justify-start items-start gap-1 min-w-0">
                  <p className="text-2xl font-bold text-white">{stats ? formatNumber(stats.new_jobs) : '—'}</p>
                  <p className="text-sm text-white/50">New Jobs</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Matches Section (users only) */}
        {(user?.role === 'recruiter' || user?.role === 'admin') ? (
          <div className="bg-[#2b2b2b] px-4 md:px-16 py-24">
            <div className="container mx-auto">
              <div className="flex justify-between items-end mb-12">
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold text-white">Your dashboard</h2>
                  <p className="text-white/50 max-w-2xl">
                    Manage your company, post jobs, and view applications.
                  </p>
                </div>
                <Link to="/recruiter" className="k-btn gap-2 group">
                  Go to Dashboard
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-1 transition-transform">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        ) : (
        <div className="bg-[#2b2b2b] px-4 md:px-16 py-24">
          <div className="container mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-12">
              <div className="space-y-4">
                <h2 className="text-4xl font-bold text-white">AI Matches for You</h2>
                <p className="text-white/50 max-w-2xl">
                  {isCandidate
                    ? 'Personalized job recommendations based on your resume and skills.'
                    : 'Personalized job recommendations based on your resume and skills. Sign up to get matches tailored to you.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {!isAuthenticated && (
                  <Link to="/register" className="k-btn gap-2">
                    Sign up for AI matches
                  </Link>
                )}
                <Link to={isAuthenticated ? '/ai-matches' : '/jobs'} className="k-btn-outline gap-2 text-brand-accent group">
                  {isCandidate ? 'View All' : 'Browse Jobs'}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-1 transition-transform">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isLoading ? (
                <div className="md:col-span-2 p-12 rounded-xl bg-[#1a1a1a] border border-white/10 text-center">
                  <p className="text-white/60">Loading jobs...</p>
                </div>
              ) : (
                renderFeaturedJobs()
              )}
            </div>
          </div>
        </div>
        )}

        {/* How It Works Section */}
        <div className="bg-[#1a1a1a] px-4 md:px-16 py-24 border-y border-white/10">
          <div className="container mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl font-bold text-white">How Kraftisium Works</h2>
              <p className="text-white/50 max-w-2xl mx-auto">
                Our AI-driven process ensures you only spend time on opportunities where you have the highest chance of success.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center space-y-6 group">
                <div className="w-20 h-20 rounded-full bg-[#2b2b2b] border border-white/10 flex items-center justify-center shadow-brand group-hover:border-[#fcc636]/50 transition-all">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fcc636" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">Create account</h3>
                  <p className="text-sm text-white/50 leading-relaxed">
                    Join our community of professionals and start your journey.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center space-y-6 group">
                <div className="w-20 h-20 rounded-full bg-[#fcc636] flex items-center justify-center shadow-brand group-hover:scale-105 transition-all">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2b2b2b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">Upload CV/Resume</h3>
                  <p className="text-sm text-white/50 leading-relaxed">
                    Upload your resume for our AI to analyze your unique skills.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center space-y-6 group">
                <div className="w-20 h-20 rounded-full bg-[#2b2b2b] border border-white/10 flex items-center justify-center shadow-brand group-hover:border-[#fcc636]/50 transition-all">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fcc636" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">AI Matching</h3>
                  <p className="text-sm text-white/50 leading-relaxed">
                    Our AI matches you with jobs where you have the highest success rate.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center text-center space-y-6 group">
                <div className="w-20 h-20 rounded-full bg-[#2b2b2b] border border-white/10 flex items-center justify-center shadow-brand group-hover:border-[#fcc636]/50 transition-all">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fcc636" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">Apply job</h3>
                  <p className="text-sm text-white/50 leading-relaxed">
                    Apply with confidence to roles that truly fit your profile.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="bg-[#1a1a1a] px-4 md:px-16 py-20 md:py-24 border-y border-white/10">
          <div className="container mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-3">
              Clients Testimonial
            </h2>
            <div className="flex items-center justify-center gap-2 mb-12 md:mb-16">
              <StarRating rating={AVERAGE_RATING} />
              <span className="text-white font-bold text-lg">{AVERAGE_RATING.toFixed(1)}</span>
              <span className="text-white/50 text-sm">out of 5 · based on {TESTIMONIALS.length} reviews</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={i}
                  className="flex flex-col p-6 rounded-xl bg-[#2b2b2b] border border-white/10 shadow-brand hover:border-[#fcc636]/30 transition-all min-h-[260px]"
                >
                  <div className="mb-4">
                    <StarRating rating={t.rating} />
                  </div>
                  <p className="text-base text-white/80 leading-relaxed flex-grow mb-6">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#fcc636]/20 flex items-center justify-center text-[#fcc636] font-bold text-lg">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-base font-medium text-white">{t.name}</p>
                        <p className="text-sm text-white/50">{t.role}</p>
                      </div>
                    </div>
                    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" className="w-10 h-10 text-white/20 shrink-0">
                      <path fillRule="evenodd" clipRule="evenodd" d="M22 34C22 36.1217 21.1571 38.1566 19.6569 39.6569C18.1566 41.1571 16.1217 42 14 42C11.8783 42 9.84344 41.1571 8.34315 39.6569C6.84285 38.1566 6 36.1217 6 34C6 29.58 14 6 14 6H18L14 26C16.1217 26 18.1566 26.8429 19.6569 28.3431C21.1571 29.8434 22 31.8783 22 34ZM42 34C42 36.1217 41.1571 38.1566 39.6569 39.6569C38.1566 41.1571 36.1217 42 34 42C31.8783 42 29.8434 41.1571 28.3431 39.6569C26.8429 38.1566 26 36.1217 26 34C26 29.58 34 6 34 6H38L34 26C36.1217 26 38.1566 26.8429 39.6569 28.3431C41.1571 29.8434 42 31.8783 42 34Z" fill="currentColor" />
                    </svg>
                  </div>
                </div>
              ))}
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
            isCandidate
              ? () => {
                  void handleApply(selectedJob.id)
                }
              : undefined
          }
          applied={appliedJobIds.has(selectedJob.id)}
        />
      )}
    </>
  )
}

export default HomePage