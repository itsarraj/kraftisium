import { tryRefreshAuth } from './authRefresh';
import { apiUrl } from '../config/api';

export interface Resume {
  id: string;
  user_id: string;
  title: string;
  content?: any;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateResumeRequest {
  title: string;
  content: any;
}

export interface Application {
  id: string;
  job_id: string;
  user_id: string;
  resume_id?: string | null;
  status: string;
  applied_at: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationDetailed extends Application {
  candidate_name: string;
  candidate_email: string;
  candidate_bio?: string | null;
  resume_title?: string | null;
  resume_file_name?: string | null;
  match_score?: number | null;
  position_title?: string | null;
}

export interface RecruiterInboxApplication {
  id: string;
  job_id: string;
  user_id: string;
  resume_id?: string | null;
  status: string;
  applied_at: string;
  candidate_name: string;
  candidate_email: string;
  resume_file_name?: string | null;
  match_score?: number | null;
  position_title: string;
  company_name: string;
}

export interface RecruiterOverview {
  active_jobs: number;
  total_applications: number;
  new_applications_7d: number;
  pending_review: number;
  setup_complete: boolean;
  recent_applications: RecruiterInboxApplication[];
}

export interface JobApplicationCount {
  job_id: string;
  position_title: string;
  status: string;
  application_count: number;
  new_count_7d: number;
}

export interface ErrorResponse {
  error: string;
  message?: string;
}

export interface Job {
  id: string;
  company_id?: string | null;
  company_name: string;
  company_logo_url?: string;
  position_title: string;
  location: string;
  employment_type: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_period?: string;
  description?: string;
  status?: string | null;
  featured?: boolean;
  match_score?: number;
  posted_at: string;
  created_at: string;
  updated_at: string;
}

export interface JobPageResponse {
  jobs: Job[];
  total_count: number;
  page: number;
  total_pages: number;
}

export interface Stats {
  live_jobs: number;
  companies: number;
  candidates: number;
  new_jobs: number;
  updated_at?: string;
}

export interface JobFilter {
  location?: string;
  employment_type?: string;
  salary_min?: number;
  salary_period?: string;
  posted_within_days?: number;
  page?: number;
  limit?: number;
}

export interface JobSearchParams {
  q?: string;
  location?: string;
  page?: number;
  limit?: number;
}

export interface Company {
  id: string;
  name: string;
  logo_url?: string;
  website?: string;
  about?: string;
  industry?: string;
  employee_size?: string;
  head_office?: string;
  company_type?: string;
  since?: number;
  specialization?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyRequest {
  name: string;
  logo_url?: string;
  website?: string;
  about?: string;
  industry?: string;
  employee_size?: string;
  head_office?: string;
  company_type?: string;
  since?: number;
  specialization?: string[];
}

export interface CreateJobRequest {
  company_id: string;
  position_title: string;
  location: string;
  employment_type: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_period?: string;
  description?: string;
  requirements?: string;
  facilities?: string;
  tags?: string[];
}

export interface UpdateCompanyRequest {
  name?: string;
  logo_url?: string;
  website?: string;
  about?: string;
  industry?: string;
  employee_size?: string;
  head_office?: string;
  company_type?: string;
  since?: number;
  specialization?: string[];
}

export interface UpdateJobRequest {
  position_title?: string;
  location?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_period?: string;
  description?: string;
  status?: string;
  featured?: boolean;
}

export interface RecruiterLimitsInfo {
  is_premium: boolean;
  active_jobs: number;
  free_active_jobs_limit: number;
  can_create_job: boolean;
  can_feature_jobs: boolean;
}

export interface SuggestedCandidate {
  user_id: string;
  candidate_name: string;
  candidate_email: string;
  resume_title?: string | null;
  resume_file_name?: string | null;
  match_score: number;
  already_applied: boolean;
}

export interface TalentPool {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTalentPoolRequest {
  name: string;
}

export interface PoolCandidateDetail {
  user_id: string;
  resume_id: string;
  candidate_name: string;
  candidate_email: string;
  resume_title?: string | null;
  resume_file_name?: string | null;
}

export type RecruiterTab = 'overview' | 'jobs' | 'pipeline' | 'sourcing' | 'applicants' | 'settings' | 'guides';

export const APPLICATION_STATUSES = ['applied', 'shortlisted', 'interview', 'rejected', 'hired'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

class BffApiService {
  private getFullUrl(endpoint: string): string {
    return apiUrl(endpoint);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = this.getFullUrl(endpoint);

    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json().catch(() => ({
          error: 'NetworkError',
          message: `HTTP ${response.status}: ${response.statusText}`
        }));
        throw new Error(errorData.message || errorData.error);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  private async authenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    userId?: string,
    isRetry = false
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };
    if (userId) {
      headers['X-User-Id'] = userId;
    }

    const url = this.getFullUrl(endpoint);
    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const response = await fetch(url, config);

    if (response.status === 401 && !isRetry) {
      try {
        await tryRefreshAuth();
        return this.authenticatedRequest<T>(endpoint, options, userId, true);
      } catch {
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const errorData: ErrorResponse = await response.json().catch(() => ({
        error: 'NetworkError',
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.message || errorData.error);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // ===== HEALTH ENDPOINT =====

  async checkHealth(): Promise<string> {
    const url = this.getFullUrl('/health');
    const response = await fetch(url);
    return response.text();
  }

  async getStats(): Promise<Stats> {
    return this.request<Stats>('/stats');
  }

  // ===== RESUME ENDPOINTS =====
  // userId required - pass from useAuth().user.id

  async getResumes(userId: string): Promise<Resume[]> {
    return this.authenticatedRequest<Resume[]>('/resumes', {}, userId);
  }

  async createResume(userId: string, data: CreateResumeRequest): Promise<Resume> {
    return this.authenticatedRequest<Resume>('/resumes', {
      method: 'POST',
      body: JSON.stringify(data),
    }, userId);
  }

  async uploadResume(userId: string, file: File, isRetry = false): Promise<Resume> {
    const formData = new FormData();
    formData.append('file', file);

    const url = this.getFullUrl('/resumes/upload');
    const headers: Record<string, string> = {
      'X-User-Id': userId,
    };

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: formData,
    });

    if (response.status === 401 && !isRetry) {
      try {
        await tryRefreshAuth();
        return this.uploadResume(userId, file, true);
      } catch {
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Upload failed', message: response.statusText }));
      const msg = err.message || err.error || 'Upload failed';
      throw new Error(typeof msg === 'string' ? msg : 'Upload failed');
    }
    return response.json();
  }

  async getResume(userId: string, id: string): Promise<Resume> {
    return this.authenticatedRequest<Resume>(`/resumes/${id}`, {}, userId);
  }

  async updateResume(userId: string, id: string, data: Partial<CreateResumeRequest>): Promise<Resume> {
    return this.authenticatedRequest<Resume>(`/resumes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, userId);
  }

  async deleteResume(userId: string, id: string): Promise<{ message: string }> {
    return this.authenticatedRequest<{ message: string }>(`/resumes/${id}`, {
      method: 'DELETE',
    }, userId);
  }

  // ===== APPLICATION ENDPOINTS =====

  async getMyApplications(userId: string): Promise<Application[]> {
    return this.authenticatedRequest<Application[]>('/applications', {}, userId);
  }

  async applyToJob(userId: string, jobId: string): Promise<Application> {
    return this.authenticatedRequest<Application>('/applications', {
      method: 'POST',
      body: JSON.stringify({ job_id: jobId }),
    }, userId);
  }

  async getJobApplications(userId: string, jobId: string): Promise<Application[]> {
    return this.authenticatedRequest<Application[]>(`/applications/job/${jobId}`, {}, userId);
  }

  async getJobApplicationsDetailed(userId: string, jobId: string): Promise<ApplicationDetailed[]> {
    return this.authenticatedRequest<ApplicationDetailed[]>(`/applications/job/${jobId}/detailed`, {}, userId);
  }

  async updateApplication(userId: string, id: string, status: string): Promise<Application> {
    return this.authenticatedRequest<Application>(`/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }, userId);
  }

  // ===== JOB ENDPOINTS =====

  async getJobs(filter: JobFilter = {}): Promise<JobPageResponse> {
    const queryParams = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, value.toString());
    });
    const query = queryParams.toString();
    return this.request<JobPageResponse>(`/jobs${query ? `?${query}` : ''}`);
  }

  /** Full-text job search backed by Tantivy on the BFF */
  async searchJobs(params: JobSearchParams = {}): Promise<JobPageResponse> {
    const queryParams = new URLSearchParams();
    if (params.q?.trim()) queryParams.set('q', params.q.trim());
    if (params.location?.trim()) queryParams.set('location', params.location.trim());
    if (params.page !== undefined) queryParams.set('page', String(params.page));
    if (params.limit !== undefined) queryParams.set('limit', String(params.limit));
    const query = queryParams.toString();
    return this.request<JobPageResponse>(`/jobs/search${query ? `?${query}` : ''}`);
  }

  async getJob(id: string): Promise<Job> {
    return this.request<Job>(`/jobs/${id}`);
  }

  async getSuggestedJobs(userId: string): Promise<Job[]> {
    return this.authenticatedRequest<Job[]>(`/jobs/suggested/${userId}`, {}, userId);
  }

  /** Recompute AI matches (Tantivy prefilter + embeddings or keyword fallback). */
  async refreshSuggestedJobs(userId: string): Promise<{ status: string; user_id: string; mode?: string }> {
    return this.authenticatedRequest<{ status: string; user_id: string; mode?: string }>(
      `/jobs/suggested/${userId}/refresh`,
      { method: 'POST' },
      userId
    );
  }

  // ===== ADMIN (admin role only) =====

  async getAdminOverview(): Promise<AdminOverview> {
    return this.authenticatedRequest<AdminOverview>('/admin/overview');
  }

  async getAdminUsers(): Promise<AdminUserRow[]> {
    return this.authenticatedRequest<AdminUserRow[]>('/admin/users');
  }

  // ===== SAVED JOBS =====

  async getSavedJobs(userId: string): Promise<Job[]> {
    return this.authenticatedRequest<Job[]>('/saved-jobs', {}, userId);
  }

  async saveJob(userId: string, jobId: string): Promise<void> {
    await this.authenticatedRequest<void>(`/saved-jobs/${jobId}`, { method: 'POST' }, userId);
  }

  async unsaveJob(userId: string, jobId: string): Promise<void> {
    await this.authenticatedRequest<void>(`/saved-jobs/${jobId}`, { method: 'DELETE' }, userId);
  }

  // ===== RECRUITER ENDPOINTS =====

  async createCompany(data: CreateCompanyRequest): Promise<Company> {
    return this.authenticatedRequest<Company>('/recruiter/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompany(id: string, data: UpdateCompanyRequest): Promise<Company> {
    return this.authenticatedRequest<Company>(`/recruiter/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getCompany(id: string): Promise<Company> {
    return this.authenticatedRequest<Company>(`/recruiter/companies/${id}`);
  }

  async listMyCompanies(): Promise<Company[]> {
    return this.authenticatedRequest<Company[]>('/recruiter/my-companies');
  }

  async getRecruiterLimits(companyId: string): Promise<RecruiterLimitsInfo> {
    return this.authenticatedRequest<RecruiterLimitsInfo>(
      `/recruiter/limits?company_id=${encodeURIComponent(companyId)}`
    );
  }

  async listRecruiterJobs(companyId: string): Promise<Job[]> {
    return this.authenticatedRequest<Job[]>(`/recruiter/jobs?company_id=${encodeURIComponent(companyId)}`);
  }

  async getSuggestedCandidates(jobId: string, companyId: string): Promise<SuggestedCandidate[]> {
    return this.authenticatedRequest<SuggestedCandidate[]>(
      `/recruiter/jobs/${jobId}/suggested-candidates?company_id=${encodeURIComponent(companyId)}`
    );
  }

  async requestIntro(jobId: string, candidateUserId: string, companyId: string, note?: string): Promise<void> {
    await this.authenticatedRequest<void>(
      `/recruiter/jobs/${jobId}/suggested-candidates/${candidateUserId}/request-intro?company_id=${encodeURIComponent(companyId)}`,
      { method: 'POST', body: JSON.stringify({ note }) }
    );
  }

  async createJob(data: CreateJobRequest): Promise<Job> {
    return this.authenticatedRequest<Job>('/recruiter/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateJob(jobId: string, companyId: string, data: UpdateJobRequest): Promise<Job> {
    return this.authenticatedRequest<Job>(
      `/recruiter/jobs/${jobId}?company_id=${encodeURIComponent(companyId)}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    );
  }

  async duplicateJob(jobId: string, companyId: string): Promise<Job> {
    return this.authenticatedRequest<Job>(
      `/recruiter/jobs/${jobId}/duplicate?company_id=${encodeURIComponent(companyId)}`,
      { method: 'POST' }
    );
  }

  async uploadBulkResume(jobId: string, companyId: string, file: File, content: string, candidateName: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('content', content);
    formData.append('candidate_name', candidateName);

    const url = this.getFullUrl(`/recruiter/jobs/${jobId}/bulk-resume?company_id=${encodeURIComponent(companyId)}`);

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Upload failed', message: response.statusText }));
      const msg = err.message || err.error || 'Upload failed';
      throw new Error(typeof msg === 'string' ? msg : 'Upload failed');
    }
    return response.json();
  }

  async getRecruiterOverview(companyId: string): Promise<RecruiterOverview> {
    return this.authenticatedRequest<RecruiterOverview>(
      `/recruiter/overview?company_id=${encodeURIComponent(companyId)}`
    );
  }

  async getRecruiterInbox(companyId?: string, limit = 50): Promise<RecruiterInboxApplication[]> {
    const params = new URLSearchParams();
    if (companyId) params.append('company_id', companyId);
    params.append('limit', limit.toString());
    return this.authenticatedRequest<RecruiterInboxApplication[]>(`/recruiter/inbox?${params.toString()}`);
  }

  async getJobApplicationCounts(companyId: string): Promise<JobApplicationCount[]> {
    return this.authenticatedRequest<JobApplicationCount[]>(
      `/recruiter/job-stats?company_id=${encodeURIComponent(companyId)}`
    );
  }

  async downloadApplicationResume(applicationId: string, companyId: string): Promise<Blob> {
    const url = this.getFullUrl(
      `/applications/${applicationId}/resume?company_id=${encodeURIComponent(companyId)}`
    );
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
      throw new Error('Failed to download resume');
    }
    return response.blob();
  }

  async quickMatchResumes(jobText: string, resumeTexts: string[]): Promise<{ scores: number[] }> {
    return this.authenticatedRequest<{ scores: number[] }>('/recruiter/quick-match', {
      method: 'POST',
      body: JSON.stringify({
        job_text: jobText,
        resume_texts: resumeTexts,
      }),
    });
  }

  async createTalentPool(companyId: string, data: CreateTalentPoolRequest): Promise<TalentPool> {
    return this.authenticatedRequest<TalentPool>(`/recruiter/talent-pools?company_id=${encodeURIComponent(companyId)}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listTalentPools(companyId: string): Promise<TalentPool[]> {
    return this.authenticatedRequest<TalentPool[]>(`/recruiter/talent-pools?company_id=${encodeURIComponent(companyId)}`);
  }

  async getTalentPool(poolId: string, companyId: string): Promise<TalentPool> {
    return this.authenticatedRequest<TalentPool>(`/recruiter/talent-pools/${poolId}?company_id=${encodeURIComponent(companyId)}`);
  }

  async deleteTalentPool(poolId: string, companyId: string): Promise<void> {
    return this.authenticatedRequest<void>(`/recruiter/talent-pools/${poolId}?company_id=${encodeURIComponent(companyId)}`, {
      method: 'DELETE',
    });
  }

  async uploadTalentPoolResume(poolId: string, companyId: string, file: File, content: string, candidateName: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('content', content);
    formData.append('candidate_name', candidateName);

    const url = this.getFullUrl(`/recruiter/talent-pools/${poolId}/upload?company_id=${encodeURIComponent(companyId)}`);

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.message || err.error || 'Upload failed');
    }
    return response.json();
  }

  async listPoolCandidates(poolId: string, companyId: string): Promise<PoolCandidateDetail[]> {
    return this.authenticatedRequest<PoolCandidateDetail[]>(`/recruiter/talent-pools/${poolId}/candidates?company_id=${encodeURIComponent(companyId)}`);
  }

  async scorePoolCandidatesCustom(jobText: string, userIds: string[]): Promise<{ scores: Record<string, number> }> {
    return this.authenticatedRequest<{ scores: Record<string, number> }>('/recruiter/talent-pools/score-custom', {
      method: 'POST',
      body: JSON.stringify({ job_text: jobText, user_ids: userIds }),
    });
  }

  // ===== EMPLOYER PROFILE (BFF-owned, auth has only email/name/password) =====

  async upsertEmployerProfile(data: CreateEmployerProfileRequest): Promise<EmployerProfile> {
    return this.authenticatedRequest<EmployerProfile>('/employer-profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEmployerProfile(): Promise<EmployerProfile | null> {
    try {
      return await this.authenticatedRequest<EmployerProfile>('/employer-profiles/me');
    } catch {
      return null;
    }
  }

  async getEmployerCompany(): Promise<Company | null> {
    try {
      return await this.authenticatedRequest<Company>('/employer-profiles/me/company');
    } catch {
      return null;
    }
  }

  // ===== CANDIDATE PROFILE (BFF-owned) =====

  async upsertCandidateProfile(data: CreateCandidateProfileRequest = {}): Promise<CandidateProfile> {
    return this.authenticatedRequest<CandidateProfile>('/candidate-profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCandidateProfile(): Promise<CandidateProfile | null> {
    try {
      return await this.authenticatedRequest<CandidateProfile>('/candidate-profiles/me');
    } catch {
      return null;
    }
  }
}

export interface AdminOverview {
  total_users: number;
  signups_7d: number;
  total_candidates: number;
  total_recruiters: number;
  resumes_uploaded: number;
  active_jobs: number;
  applications_total: number;
  applications_7d: number;
  premium_subscribers: number;
  premium_conversions_7d: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  email_verified: boolean;
  is_premium_candidate: boolean;
  created_at: string;
}

export interface EmployerProfile {
  user_id: string;
  job_title?: string;
  mobile?: string;
  company_type: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployerProfileRequest {
  job_title?: string;
  mobile?: string;
  company_type: string;
}

export interface CandidateProfile {
  user_id: string;
  bio?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCandidateProfileRequest {
  bio?: string | null;
}

export const bffApi = new BffApiService();
