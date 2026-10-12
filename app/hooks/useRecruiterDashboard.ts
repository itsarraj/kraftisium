import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { EMPLOYER_SIGNUP_STORAGE_KEY } from '@/constants/config';
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
} from '@/services/bffApi';

const TEST_COMPANY_ID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

function notifyError(message: string) {
  Alert.alert('Error', message);
}

function notifySuccess(message: string) {
  Alert.alert('Done', message);
}

export function useRecruiterDashboard(userId?: string, userRole?: string, userEmail?: string) {
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
      setUnifiedInbox([]);
      setJobStats([]);
      return;
    }
    const [jobList, ov, inboxList, unifiedInboxData, stats, lim] = await Promise.all([
      bffApi.listRecruiterJobs(companyId),
      bffApi.getRecruiterOverview(companyId),
      bffApi.getRecruiterInbox(companyId, 100),
      bffApi.getRecruiterInbox(),
      bffApi.getJobApplicationCounts(companyId),
      bffApi.getRecruiterLimits(companyId).catch(() => null),
    ]);
    setJobs(jobList);
    setOverview(ov);
    setInbox(inboxList);
    setUnifiedInbox(unifiedInboxData);
    setJobStats(stats);
    setLimits(lim);
    setSelectedJobId((prev) => prev || jobList[0]?.id || '');
  }, [companyId]);

  const loadApplicationsForJob = useCallback(
    async (jobId: string) => {
      if (!userId || !jobId) return;
      setApplicationsLoading(true);
      try {
        const list = await bffApi.getJobApplicationsDetailed(userId, jobId);
        setApplications(list);
      } catch (e) {
        notifyError(e instanceof Error ? e.message : 'Failed to load applications.');
        setApplications([]);
      } finally {
        setApplicationsLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    setLoading(true);
    loadCompany().finally(() => setLoading(false));
  }, [loadCompany]);

  useEffect(() => {
    if (!companyId) return;
    refreshDashboard().catch((e) =>
      notifyError(e instanceof Error ? e.message : 'Failed to load dashboard.')
    );
  }, [companyId, refreshDashboard]);

  useEffect(() => {
    if (selectedJobId && (activeTab === 'applications' || activeTab === 'kanban')) {
      loadApplicationsForJob(selectedJobId);
    }
  }, [selectedJobId, activeTab, loadApplicationsForJob]);

  useEffect(() => {
    if (!userId) return;
    AsyncStorage.getItem(EMPLOYER_SIGNUP_STORAGE_KEY).then(async (stored) => {
      if (!stored) return;
      if (!stored) {
        if (__DEV__ && userEmail === 'recruiter@test.com') {
          setEmployerProfile({
            user_id: userId,
            job_title: 'HR Manager',
            mobile: '+1234567890',
            company_type: 'direct',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          const c = await bffApi.getCompany(TEST_COMPANY_ID).catch(() => null);
          if (c) setMyCompanies([c]);
        }
        return;
      }
      try {
        const data = JSON.parse(stored) as {
          role?: string;
          mobile?: string;
          companyType?: string;
        };
        await bffApi.upsertEmployerProfile({
          job_title: data.role || undefined,
          mobile: data.mobile || undefined,
          company_type: data.companyType ?? 'direct',
        });
        setActiveTab('company');
        await loadCompany();
      } catch (e) {
        console.error(e);
      } finally {
        AsyncStorage.removeItem(EMPLOYER_SIGNUP_STORAGE_KEY);
      }
    });
  }, [userId, loadCompany, userEmail]);

  const saveCompany = async (payload: CreateCompanyRequest, isEdit: boolean) => {
    if (isEdit && company) {
      const updated = await bffApi.updateCompany(company.id, payload as UpdateCompanyRequest);
      setMyCompanies(prev => prev.map(c => c.id === company.id ? updated : c));
      if (employerProfile) {
        setEmployerProfile({ ...employerProfile });
      }
      notifySuccess('Company updated.');
      return updated;
    }
    const created = await bffApi.createCompany(payload);
    setMyCompanies(prev => [...prev, created]);
    setSelectedCompanyId(created.id);
    
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
      notifyError(e instanceof Error ? e.message : 'Could not load suggested candidates.');
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
      notifyError(e instanceof Error ? e.message : 'Could not post job.');
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
      notifyError(e instanceof Error ? e.message : 'Could not update job.');
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
      notifyError(e instanceof Error ? e.message : 'Could not duplicate job.');
      throw e;
    }
  };

  const requestIntro = async (jobId: string, candidateUserId: string, note?: string) => {
    if (!companyId) return;
    try {
      await bffApi.requestIntro(jobId, candidateUserId, companyId, note);
      notifySuccess('Intro request sent.');
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Could not send intro request.');
      throw e;
    }
  };

  const updateApplicationStatus = async (applicationId: string, status: string) => {
    if (!userId) return;
    const updated = await bffApi.updateApplication(userId, applicationId, status);
    setApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId ? { ...a, status: updated.status, updated_at: updated.updated_at } : a
      )
    );
    setInbox((prev) => prev.map((a) => (a.id === applicationId ? { ...a, status: updated.status } : a)));
    setUnifiedInbox((prev) => prev.map((a) => (a.id === applicationId ? { ...a, status: updated.status } : a)));
    if (overview) {
      setOverview({
        ...overview,
        recent_applications: overview.recent_applications.map((a) =>
          a.id === applicationId ? { ...a, status: updated.status } : a
        ),
      });
    }
    notifySuccess(`Marked as ${status}.`);
  };

  const downloadResume = async (applicationId: string) => {
    if (!companyId) return;
    try {
      await bffApi.downloadApplicationResume(applicationId, companyId);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Could not download resume.');
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
