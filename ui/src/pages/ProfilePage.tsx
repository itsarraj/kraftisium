import { useState, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../services/authApi'
import { bffApi, Resume, CreateEmployerProfileRequest, Job } from '../services/bffApi'
import { subscriptionApi } from '../services/subscriptionApi'
import { getErrorMessage, notifyError, notifySuccess } from '../lib/toast'
import { usePricingInfo } from '../hooks/usePricingInfo'
import { STATUS_META } from '../components/recruiter/pipelineUtils'
import JobCardSkeleton from '../components/JobCardSkeleton';
import JobDetailModal from '../components/recruiter/JobDetailDrawer';

import CandidateSidebar from '../components/candidate/CandidateSidebar';
import CandidateProfileTab from '../components/candidate/CandidateProfileTab';
import CandidateSettingsTab from '../components/candidate/CandidateSettingsTab';
import CandidateGuidesTab from '../components/candidate/CandidateGuidesTab';
import CandidateSubscriptionTab from '../components/candidate/CandidateSubscriptionTab';

const ProfilePage = () => {
  const { user, logout, refreshUser, clearSession } = useAuth()
  const { yearlyPrice, freeMatchLimit } = usePricingInfo()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab = (tabParam && ['profile', 'applications', 'subscription', 'settings', 'guides'].includes(tabParam))
    ? (tabParam as 'profile' | 'applications' | 'subscription' | 'settings' | 'guides')
    : 'profile'

  const [activeTab, setActiveTab] = useState<'profile' | 'applications' | 'subscription' | 'settings' | 'guides'>(initialTab)

  // Update activeTab if search params change externally
  useEffect(() => {
    if (tabParam && ['profile', 'applications', 'subscription', 'settings', 'guides'].includes(tabParam)) {
      setActiveTab(tabParam as any)
    }
  }, [tabParam])

  // Helper function to update tab and query parameters
  const handleTabChange = (tab: 'profile' | 'applications' | 'subscription' | 'settings' | 'guides') => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [profileForm, setProfileForm] = useState({ name: '' })
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeUploading, setResumeUploading] = useState(false)
  const [resumeError, setResumeError] = useState('')

  const [bio, setBio] = useState('')
  const [userApplications, setUserApplications] = useState<any[]>([])
  const [appsLoading, setAppsLoading] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  const loadUserApplications = useCallback(async () => {
    if (!user?.id || user.role !== 'user') return
    setAppsLoading(true)
    try {
      const apps = await bffApi.getMyApplications(user.id)
      const detailed = await Promise.all(
        apps.map(async (app) => {
          try {
            const job = await bffApi.getJob(app.job_id)
            return { ...app, job }
          } catch {
            return { ...app, job: null }
          }
        })
      )
      detailed.sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
      setUserApplications(detailed)
    } catch (e) {
      console.error(e)
    } finally {
      setAppsLoading(false)
    }
  }, [user?.id, user?.role])

  useEffect(() => {
    if (activeTab === 'applications') {
      void loadUserApplications()
    }
  }, [activeTab, loadUserApplications])

  const [isRedeeming, setIsRedeeming] = useState(false)

  const handleRedeemCredits = async () => {
    if (!user) return

    try {
      setIsRedeeming(true)
      const res = await subscriptionApi.redeemCredits()
      notifySuccess(res.message)
      await refreshUser()
    } catch (e) {
      notifyError(getErrorMessage(e, 'Failed to redeem credits'))
    } finally {
      setIsRedeeming(false)
    }
  }
  const [employerForm, setEmployerForm] = useState<CreateEmployerProfileRequest>({
    company_type: 'company',
    job_title: '',
    mobile: '',
  })
  const [employerLoading, setEmployerLoading] = useState(false)
  const [employerError, setEmployerError] = useState('')
  const [employerSuccess, setEmployerSuccess] = useState('')

  const handleLogout = async () => {
    await logout()
    notifySuccess('Logged out successfully.')
  }

  const handleUploadResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    if (file.size > 5 * 1024 * 1024) {
      setResumeError('File size must be less than 5MB')
      return
    }
    setResumeError('')
    setResumeUploading(true)
    try {
      await bffApi.uploadResume(user.id, file)
      await loadResumes()
      notifySuccess('Resume uploaded successfully')
    } catch (err) {
      setResumeError(getErrorMessage(err, 'Failed to upload resume'))
      notifyError('Failed to upload resume')
    } finally {
      setResumeUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const loadResumes = useCallback(async () => {
    if (!user?.id) return
    setResumeLoading(true)
    setResumeError('')
    try {
      const list = await bffApi.getResumes(user.id)
      setResumes(list)
    } catch (e) {
      setResumeError(e instanceof Error ? e.message : 'Failed to load resumes')
    } finally {
      setResumeLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name })
    }
  }, [user])

  useEffect(() => {
    if (user?.id && user.role === 'user') loadResumes()
  }, [loadResumes, user?.id])

  useEffect(() => {
    if (user?.id && (user.role === 'user' || user.role === 'admin')) {
      bffApi.getCandidateProfile()
        .then((p) => {
          if (p) setBio(p.bio ?? '')
          else bffApi.upsertCandidateProfile({}).catch(() => {})
        })
        .catch(() => {})
    }
  }, [user?.id, user?.role])

  useEffect(() => {
    if (!user?.id) return
    if (user.role !== 'recruiter' && user.role !== 'admin') return
    bffApi
      .getEmployerProfile()
      .then((p) => {
        if (p) {

          setEmployerForm({
            company_type: p.company_type ?? 'company',
            job_title: p.job_title ?? '',
            mobile: p.mobile ?? '',
          })
        } else {
          const stub: CreateEmployerProfileRequest = { company_type: 'company' }
          setEmployerForm(stub)
          bffApi.upsertEmployerProfile(stub).catch(() => {})
        }
      })
      .catch(() => {})
  }, [user?.id, user?.role])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    setProfileLoading(true)
    try {
      await authApi.updateProfile({ name: profileForm.name })
      if (user?.role === 'user' || user?.role === 'admin') {
        await bffApi.upsertCandidateProfile({ bio: bio.trim() })
      }
      await refreshUser()
      const message = 'Profile updated successfully'
      setProfileSuccess(message)
      notifySuccess(message)
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to update profile')
      setProfileError(message)
      notifyError(message)
    } finally {
      setProfileLoading(false)
    }
  }

  const handleUpdateEmployerProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmployerError('')
    setEmployerSuccess('')
    setEmployerLoading(true)
    try {
      const payload: CreateEmployerProfileRequest = {
        company_type: employerForm.company_type || 'company',
        job_title: employerForm.job_title?.trim() || undefined,
        mobile: employerForm.mobile?.trim() || undefined,
      }
      await bffApi.upsertEmployerProfile(payload)

      const message = 'Employer profile updated'
      setEmployerSuccess(message)
      notifySuccess(message)
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to update employer profile')
      setEmployerError(message)
      notifyError(message)
    } finally {
      setEmployerLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')
    if (passwordForm.newPassword.length < 8) {
      const message = 'New password must be at least 8 characters'
      setPasswordError(message)
      notifyError(message)
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      const message = 'Passwords do not match'
      setPasswordError(message)
      notifyError(message)
      return
    }
    setPasswordLoading(true)
    try {
      await authApi.changePassword({
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
      })
      const message = 'Password changed successfully'
      setPasswordSuccess(message)
      notifySuccess(message)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to change password')
      setPasswordError(message)
      notifyError(message)
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteError('')
    if (deleteConfirm !== 'DELETE') {
      setDeleteError('Type DELETE to confirm')
      return
    }
    setDeleteLoading(true)
    try {
      await authApi.deleteAccount()
      clearSession()
      navigate('/account-deleted', { replace: true })
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to delete account')
      setDeleteError(message)
      notifyError(message)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>My Profile - Kraftisium</title>
        <meta name="description" content="Manage your profile and resume on Kraftisium." />
      </Helmet>

      <div className="min-h-screen bg-[#2b2b2b] text-white py-12 px-4 md:px-16">
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row gap-12 items-start">
            
            <CandidateSidebar 
              activeTab={activeTab} 
              onTabChange={handleTabChange} 
              user={user} 
              onLogout={() => void handleLogout()} 
              onGoBack={() => navigate('/')} 
            />

            <div className="flex-grow w-full">
              {activeTab === 'profile' && (
                <CandidateProfileTab
                  user={user}
                  bio={bio}
                  setBio={setBio}
                  profileForm={profileForm}
                  setProfileForm={setProfileForm}
                  profileError={profileError}
                  profileSuccess={profileSuccess}
                  profileLoading={profileLoading}
                  onUpdateProfile={handleUpdateProfile}
                  resumes={resumes}
                  resumeLoading={resumeLoading}
                  resumeError={resumeError}
                  resumeUploading={resumeUploading}
                  onUploadResume={handleUploadResume}

                  employerForm={employerForm}
                  setEmployerForm={setEmployerForm}
                  employerError={employerError}
                  employerSuccess={employerSuccess}
                  employerLoading={employerLoading}
                  onUpdateEmployerProfile={handleUpdateEmployerProfile}
                />
              )}

              {activeTab === 'applications' && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h3 className="text-xl font-bold text-white">My Applications</h3>
                    <p className="text-xs text-white/50 mt-1">Track the status of your applications in the hiring pipeline.</p>
                  </div>
                  
                  {appsLoading ? (
                    <div className="space-y-4">
                      <JobCardSkeleton />
                      <JobCardSkeleton />
                    </div>
                  ) : userApplications.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-[#1a1a1a] p-8 space-y-4">
                      <p className="text-white/50 text-sm">You haven't applied to any jobs yet.</p>
                      <Link to="/jobs" className="inline-block px-5 py-2.5 rounded-lg bg-[#fcc636] text-[#2b2b2b] font-bold text-sm hover:bg-[#e6b535] transition-all">
                        Browse Jobs
                      </Link>
                    </div>
                  ) : (
                    <>
                      {/* Shortlisted Celebration Banner */}
                      {userApplications.some(a => a.status === 'shortlisted' || a.status === 'interview') && (
                        <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-r from-[#fcc636] to-[#ffaa00] border border-[#fcc636]/50 shadow-[0_4px_20px_rgba(252,198,54,0.3)] flex items-center justify-between group">
                          <div className="relative z-10">
                            <h3 className="text-2xl font-black text-[#2b2b2b] flex items-center gap-2">
                              🎉 You're Shortlisted!
                            </h3>
                            <p className="text-[#2b2b2b] font-bold mt-1 opacity-90">
                              Employers want to talk to you. You're beating 95% of other candidates right now. Let's go!
                            </p>
                          </div>
                          <div className="absolute -right-10 -top-10 opacity-20 transform group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                            <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                            </svg>
                          </div>
                        </div>
                      )}

                      {/* Summary Statistics Dashboard */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-[#1a1a1a] border border-white/10 text-center shadow-brand">
                          <p className="text-2xl font-bold text-white">{userApplications.length}</p>
                          <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold mt-1">Total Applied</p>
                        </div>
                        <div className="p-4 rounded-xl bg-[#1a1a1a] border border-white/10 text-center shadow-brand">
                          <p className="text-2xl font-bold text-[#fcc636]">
                            {userApplications.filter(a => a.status === 'applied' || a.status === 'shortlisted').length}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-[#fcc636]/80 font-bold mt-1">In Review</p>
                        </div>
                        <div className="p-4 rounded-xl bg-[#1a1a1a] border border-white/10 text-center shadow-brand">
                          <p className="text-2xl font-bold text-blue-400">
                            {userApplications.filter(a => a.status === 'interview').length}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-blue-400 font-bold mt-1">Interviews</p>
                        </div>
                        <div className="p-4 rounded-xl bg-[#1a1a1a] border border-white/10 text-center shadow-brand">
                          <p className="text-2xl font-bold text-green-400">
                            {userApplications.filter(a => a.status === 'hired').length}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-green-400 font-bold mt-1">Offers / Hired</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {userApplications.map((app) => {
                          const job = app.job;
                          const statusStyle = app.status in STATUS_META
                            ? STATUS_META[app.status as keyof typeof STATUS_META]
                            : { badge: 'bg-white/10 text-white/70', border: 'border-white/10', label: app.status };
                          const appliedResume = resumes.find(r => r.id === app.resume_id);

                          const getTimelineSteps = (currentStatus: string) => {
                            if (currentStatus === 'rejected') {
                              return [
                                { label: 'Applied', completed: true, active: false },
                                { label: 'Profile Viewed', completed: true, active: false },
                                { label: 'Rejected', completed: false, active: true, isRejected: true }
                              ];
                            }
                            const stages = ['applied', 'shortlisted', 'interview', 'hired'];
                            const currentIndex = stages.indexOf(currentStatus);
                            const steps = stages.map((stage, idx) => ({
                              label: stage.charAt(0).toUpperCase() + stage.slice(1),
                              completed: currentIndex >= idx,
                              active: currentStatus === stage,
                              isRejected: false
                            }));
                            // Not an independently tracked backend status -- derived: any
                            // progression past "applied" necessarily means a recruiter
                            // looked at the profile to make that call.
                            steps.splice(1, 0, {
                              label: 'Profile Viewed',
                              completed: currentIndex >= 1,
                              active: false,
                              isRejected: false
                            });
                            return steps;
                          };

                          return (
                            <div key={app.id} className="p-5 rounded-xl bg-[#1a1a1a] border border-white/10 flex flex-col gap-5 hover:border-white/20 transition-all shadow-brand">
                              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                <div className="space-y-1 min-w-0 flex-grow">
                                  <h4 className="font-bold text-white text-base truncate">{job?.position_title || 'Position Title'}</h4>
                                  <p className="text-sm text-[#fcc636] font-semibold">{job?.company_name || 'Company Name'}</p>
                                  <p className="text-xs text-white/40">{job?.location} · {job?.employment_type}</p>
                                  {appliedResume && (
                                    <div className="text-[11px] text-white/50 mt-2 flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded w-fit border border-white/5">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                      </svg>
                                      <span className="truncate max-w-[180px]" title={appliedResume.file_name || appliedResume.title}>
                                        {appliedResume.file_name || appliedResume.title}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-4 shrink-0 justify-between sm:justify-end">
                                  <div className="text-left sm:text-right">
                                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${statusStyle.badge} ${statusStyle.border}`}>
                                      {statusStyle.label}
                                    </span>
                                    <p className="text-[10px] text-white/40 mt-1">Applied {new Date(app.applied_at).toLocaleDateString()}</p>
                                  </div>
                                  {job && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedJob(job)}
                                      className="px-3 py-1.5 rounded-lg border border-white/10 text-white/70 text-xs font-bold hover:border-[#fcc636]/40 hover:text-white transition-all shadow-brand"
                                    >
                                      View Details
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Progress Timeline */}
                              {(() => {
                                const steps = getTimelineSteps(app.status);
                                return (
                                  <div className="pt-4 border-t border-white/5">
                                    <div className="flex items-center w-full">
                                      {steps.map((step, idx) => (
                                        <div key={idx} className="flex items-center flex-grow last:flex-grow-0">
                                          <div className="flex flex-col items-center relative">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-brand ${
                                              step.active
                                                ? step.isRejected
                                                  ? 'bg-red-500 text-white ring-4 ring-red-500/20'
                                                  : 'bg-[#fcc636] text-[#2b2b2b] ring-4 ring-[#fcc636]/20'
                                                : step.completed
                                                ? 'bg-[#fcc636]/80 text-[#2b2b2b]'
                                                : 'bg-[#2b2b2b] text-white/30 border border-white/10'
                                            }`}>
                                              {step.completed && !step.active ? (
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                                  <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                              ) : (
                                                idx + 1
                                              )}
                                            </div>
                                            <span className={`text-[9px] font-bold mt-1.5 whitespace-nowrap absolute top-full left-1/2 -translate-x-1/2 ${
                                              step.active
                                                ? step.isRejected
                                                  ? 'text-red-400'
                                                  : 'text-[#fcc636]'
                                                : step.completed
                                                ? 'text-white/80'
                                                : 'text-white/30'
                                            }`}>
                                              {step.label}
                                            </span>
                                          </div>
                                          {idx < steps.length - 1 && (
                                            <div className={`h-0.5 mx-2 flex-grow transition-all ${
                                              step.completed && steps[idx+1].completed
                                                ? 'bg-[#fcc636]/80'
                                                : 'bg-white/5'
                                            }`} />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    <div className="h-4" /> {/* Spacer for absolute layout step labels */}
                                  </div>
                                );
                              })()}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'subscription' && (
                <CandidateSubscriptionTab
                  user={user}
                  yearlyPrice={yearlyPrice ?? 0}
                  freeMatchLimit={freeMatchLimit ?? 0}
                  isRedeeming={isRedeeming}
                  onRedeemCredits={handleRedeemCredits}
                />
              )}

              {activeTab === 'settings' && (
                <CandidateSettingsTab
                  passwordForm={passwordForm}
                  setPasswordForm={setPasswordForm}
                  passwordError={passwordError}
                  passwordSuccess={passwordSuccess}
                  passwordLoading={passwordLoading}
                  onChangePassword={handleChangePassword}
                  deleteConfirm={deleteConfirm}
                  setDeleteConfirm={setDeleteConfirm}
                  deleteError={deleteError}
                  deleteLoading={deleteLoading}
                  onDeleteAccount={handleDeleteAccount}
                />
              )}

              {activeTab === 'guides' && (
                <CandidateGuidesTab />
              )}
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
          applied={true}
          onApply={() => {}}
        />
      )}
    </>
  )
}

export default ProfilePage
