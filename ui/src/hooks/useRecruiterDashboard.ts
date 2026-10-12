import { useCallback, useEffect, useState } from 'react';
import {
  ApplicationDetailed,
  bffApi,
  Company,
  CreateCompanyRequest,
  CreateJobRequest,
  EmployerProfile,
  Job,
  JobApplicationCount,
  RecruiterInboxApplication,
  RecruiterLimitsInfo,
  RecruiterOverview,
  RecruiterTab,
  SuggestedCandidate,
  UpdateCompanyRequest,
  UpdateJobRequest,
} from '../services/bffApi';
import { EMPLOYER_SIGNUP_STORAGE_KEY } from '../pages/EmployerSignupPage';
import { getErrorMessage, notifyError, notifySuccess } from '../lib/toast';

export function useRecruiterDashboard(userId?: string, userRole?: string) {
  const [activeTab, setActiveTab] = useState<RecruiterTab>('overview');
  const [myCompanies, setMyCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const company = myCompanies.find(c => c.id === selectedCompanyId) || null;
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobStats, setJobStats] = useState<JobApplicationCount[]>([]);
  const [overview, setOverview] = useState<RecruiterOverview | null>(null);
  const [inbox, setInbox] = useState<RecruiterInboxApplication[]>([]);
  const [unifiedInbox, setUnifiedInbox] = useState<RecruiterInboxApplication[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [applications, setApplications] = useState<ApplicationDetailed[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [limits, setLimits] = useState<RecruiterLimitsInfo | null>(null);
  const [suggestedCandidates, setSuggestedCandidates] = useState<SuggestedCandidate[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);

  const companyId = company?.id ?? null;

  const loadCompany = useCallback(async () => {
    if (!userId || (userRole !== 'recruiter' && userRole !== 'admin')) return;
    try {
      const profile = await bffApi.getEmployerProfile();
      if (profile) setEmployerProfile(profile);

      const companies = await bffApi.listMyCompanies().catch(() => []);
      setMyCompanies(companies);
      if (companies.length > 0) {
        setSelectedCompanyId(companies[0].id);
      }
    } catch (e) {
      console.error('Failed to load recruiter context', e);
    }
  }, [userId, userRole]);

  const refreshDashboard = useCallback(async () => {
    if (!companyId) {
      setJobs([]);
      setOverview(null);
      setInbox([]);
      setJobStats([]);
      return;
    }
    const [jobsData, statsData, overviewData, inboxData, unifiedInboxData, limitsData] = await Promise.all([
      bffApi.listRecruiterJobs(companyId),
      bffApi.getJobApplicationCounts(companyId),
      bffApi.getRecruiterOverview(companyId),
      bffApi.getRecruiterInbox(companyId, 100),
      bffApi.getRecruiterInbox(),
      bffApi.getRecruiterLimits(companyId).catch(() => null),
    ]);
    setJobs(jobsData);
    setOverview(overviewData);
    setInbox(inboxData);
    setUnifiedInbox(unifiedInboxData);
    setJobStats(statsData);
    setLimits(limitsData);
    setSelectedJobId((prev) => prev || jobsData[0]?.id || '');
  }, [companyId]);

  const loadApplicationsForJob = useCallback(async (jobId: string) => {
    if (!userId || !jobId) return;
    setApplicationsLoading(true);
    try {
      const list = await bffApi.getJobApplicationsDetailed(userId, jobId);
      setApplications(list);
    } catch (e) {
      notifyError(getErrorMessage(e, 'Failed to load applications.'));
      setApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    loadCompany().finally(() => setLoading(false));
  }, [loadCompany]);

  useEffect(() => {
    if (!companyId) return;
    refreshDashboard().catch((e) =>
      notifyError(getErrorMessage(e, 'Failed to load dashboard.'))
    );
  }, [companyId, refreshDashboard]);

  useEffect(() => {
    if (selectedJobId && (activeTab === 'jobs' || activeTab === 'pipeline')) {
      loadApplicationsForJob(selectedJobId);
    }
  }, [selectedJobId, activeTab, loadApplicationsForJob]);

  useEffect(() => {
    if (!userId) return;
    const stored = sessionStorage.getItem(EMPLOYER_SIGNUP_STORAGE_KEY);
    if (!stored) return;
    (async () => {
      try {
        const data = JSON.parse(stored) as { companyName?: string; role?: string; mobile?: string; companyType?: string };
        await bffApi.upsertEmployerProfile({
          job_title: data.role || undefined,
          mobile: data.mobile || undefined,
          company_type: data.companyType ?? 'direct',
        });
        setActiveTab('settings');
        await loadCompany();
      } catch (e) {
        console.error(e);
      } finally {
        sessionStorage.removeItem(EMPLOYER_SIGNUP_STORAGE_KEY);
      }
    })();
  }, [userId, loadCompany]);

  const saveCompany = async (payload: CreateCompanyRequest, isEdit: boolean) => {
    if (isEdit && company) {
      const updated = await bffApi.updateCompany(company.id, payload as UpdateCompanyRequest);
      setMyCompanies(prev => prev.map(c => c.id === company.id ? updated : c));
      notifySuccess('Company updated.');
      return updated;
    }
    const created = await bffApi.createCompany(payload);
    setMyCompanies(prev => [...prev, created]);
    setSelectedCompanyId(created.id);
    
    // Create profile if it doesn't exist
    if (!employerProfile) {
      const profile = await bffApi.upsertEmployerProfile({
        company_type: 'direct',
      });
      setEmployerProfile(profile);
    }
    notifySuccess('Company created.');
    return created;
  };

  const loadSuggestedCandidates = useCallback(async (jobId: string) => {
    if (!companyId || !jobId) {
      setSuggestedCandidates([]);
      return;
    }
    setSuggestedLoading(true);
    try {
      setSuggestedCandidates(await bffApi.getSuggestedCandidates(jobId, companyId));
    } catch (e) {
      notifyError(getErrorMessage(e, 'Could not load suggested candidates.'));
      setSuggestedCandidates([]);
    } finally {
      setSuggestedLoading(false);
    }
  }, [companyId]);

  const postJob = async (payload: CreateJobRequest) => {
    try {
      const created = await bffApi.createJob(payload);
      notifySuccess('Job posted.');
      await refreshDashboard();
      return created;
    } catch (e) {
      notifyError(getErrorMessage(e, 'Could not post job.'));
      throw e;
    }
  };

  const patchJob = async (jobId: string, data: UpdateJobRequest) => {
    if (!companyId) return;
    try {
      await bffApi.updateJob(jobId, companyId, data);
      notifySuccess('Job updated.');
      await refreshDashboard();
    } catch (e) {
      notifyError(getErrorMessage(e, 'Could not update job.'));
      throw e;
    }
  };

  const duplicateJobPost = async (jobId: string) => {
    if (!companyId) return;
    try {
      await bffApi.duplicateJob(jobId, companyId);
      notifySuccess('Job duplicated.');
      await refreshDashboard();
    } catch (e) {
      notifyError(getErrorMessage(e, 'Could not duplicate job.'));
      throw e;
    }
  };

  const requestIntro = async (jobId: string, candidateUserId: string, note?: string) => {
    if (!companyId) return;
    try {
      await bffApi.requestIntro(jobId, candidateUserId, companyId, note);
      notifySuccess('Intro request sent.');
    } catch (e) {
      notifyError(getErrorMessage(e, 'Could not send intro request.'));
      throw e;
    }
  };

  const updateApplicationStatus = async (applicationId: string, status: string) => {
    if (!userId) return;
    const updated = await bffApi.updateApplication(userId, applicationId, status);
    setApplications((prev) =>
      prev.map((a) => (a.id === applicationId ? { ...a, status: updated.status, updated_at: updated.updated_at } : a))
    );
    setInbox((prev) => prev.map((a) => (a.id === applicationId ? { ...a, status: updated.status } : a)));
    if (overview) {
      setOverview({
        ...overview,
        recent_applications: overview.recent_applications.map((a) =>
          a.id === applicationId ? { ...a, status: updated.status } : a
        ),
      });
    }
    notifySuccess(`Marked as ${status}.`, { id: `app-status-${applicationId}` });
  };

  const downloadResume = async (applicationId: string) => {
    if (!companyId) return;
    try {
      const blob = await bffApi.downloadApplicationResume(applicationId, companyId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      notifyError(getErrorMessage(e, 'Could not download resume.'));
    }
  };

  return {
    activeTab,
    setActiveTab,
    myCompanies,
    selectedCompanyId,
    setSelectedCompanyId,
    company,
    employerProfile,
    jobs,
    jobStats,
    overview,
    inbox,
    unifiedInbox,
    limits,
    suggestedCandidates,
    suggestedLoading,
    selectedJobId,
    setSelectedJobId,
    applications,
    applicationsLoading,
    loading,
    companyId,
    refreshDashboard,
    loadApplicationsForJob,
    loadSuggestedCandidates,
    saveCompany,
    postJob,
    patchJob,
    duplicateJobPost,
    requestIntro,
    updateApplicationStatus,
    downloadResume,
  };
}
