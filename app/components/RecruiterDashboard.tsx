import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import {
  DEFAULT_JOB_DESC_PLACEHOLDER,
  EMPLOYMENT_TYPES,
  JOB_TEMPLATES,
  SALARY_CURRENCIES,
} from '@/constants/jobTemplates';
import { brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { useRecruiterDashboard } from '@/hooks/useRecruiterDashboard';
import {
  APPLICATION_STATUSES,
  type ApplicationDetailed,
  type CreateCompanyRequest,
  type CreateJobRequest,
  type Job,
  type RecruiterInboxApplication,
  type RecruiterTab,
  type SuggestedCandidate,
} from '@/services/bffApi';

const TABS: { id: RecruiterTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'applications', label: 'Applications' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'kanban', label: 'Pipeline' },
  { id: 'company', label: 'Company' },
];

const KANBAN_COLUMNS = ['applied', 'shortlisted', 'interview', 'hired'] as const;

const emptyJobForm = {
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

const emptyCompanyForm = {
  name: '',
  logo_url: '',
  website: '',
  about: '',
  industry: '',
  employee_size: '',
  head_office: '',
  company_type: '',
  since: '',
  specialization: '',
};

function matchLabel(score?: number | null) {
  if (score == null) return null;
  return `${Math.round(score * 100)}% match`;
}

function ApplicantCard({
  app,
  onShortlist,
  onReject,
  onViewResume,
  onChangeStatus,
}: {
  app: ApplicationDetailed | RecruiterInboxApplication;
  onShortlist: () => void;
  onReject: () => void;
  onViewResume?: () => void;
  onChangeStatus?: (status: string) => void;
}) {
  const score = matchLabel(app.match_score);
  const bio = 'candidate_bio' in app ? app.candidate_bio : undefined;

  const pickStatus = () => {
    if (!onChangeStatus) return;
    Alert.alert(
      'Update status',
      app.candidate_name,
      APPLICATION_STATUSES.map((s) => ({
        text: s,
        onPress: () => onChangeStatus(s),
      }))
    );
  };

  return (
    <View style={{ backgroundColor: brand.surface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: brand.border }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: brand.text, fontWeight: '700', fontSize: 15 }}>{app.candidate_name}</Text>
        {score ? (
          <View style={{ backgroundColor: brand.accent + '22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
            <Text style={{ color: brand.accent, fontSize: 10, fontWeight: '700' }}>{score}</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ color: brand.muted, fontSize: 12, marginTop: 4 }}>{app.candidate_email}</Text>
      {'position_title' in app && app.position_title ? (
        <Text style={{ color: brand.muted, fontSize: 11, marginTop: 2 }}>{app.position_title}</Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, alignItems: 'center' }}>
        <Text style={{ color: brand.accent, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
          {app.status}
        </Text>
        <Text style={{ color: brand.muted, fontSize: 10 }}>
          {new Date(app.applied_at).toLocaleDateString()}
        </Text>
      </View>
      {bio ? (
        <Text style={{ color: brand.muted, fontSize: 11, marginTop: 6 }} numberOfLines={2}>
          {bio}
        </Text>
      ) : null}
      {'resume_file_name' in app && app.resume_file_name ? (
        <Text style={{ color: brand.muted, fontSize: 11, marginTop: 4 }}>Resume: {app.resume_file_name}</Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {onViewResume && app.resume_id ? (
          <Pressable onPress={onViewResume} style={{ padding: 8, borderRadius: 8, borderWidth: 1, borderColor: brand.border }}>
            <Text style={{ color: brand.text, fontSize: 11, fontWeight: '700' }}>View resume</Text>
          </Pressable>
        ) : null}
        {app.status !== 'shortlisted' && app.status !== 'hired' ? (
          <Pressable onPress={onShortlist} style={{ padding: 8, borderRadius: 8, backgroundColor: brand.accent + '22' }}>
            <Text style={{ color: brand.accent, fontSize: 11, fontWeight: '700' }}>Shortlist</Text>
          </Pressable>
        ) : null}
        {app.status !== 'rejected' && app.status !== 'hired' ? (
          <Pressable onPress={onReject} style={{ padding: 8, borderRadius: 8, backgroundColor: brand.danger + '22' }}>
            <Text style={{ color: brand.danger, fontSize: 11, fontWeight: '700' }}>Reject</Text>
          </Pressable>
        ) : null}
        {onChangeStatus ? (
          <Pressable onPress={pickStatus} style={{ padding: 8, borderRadius: 8, backgroundColor: brand.surface2 }}>
            <Text style={{ color: brand.accent, fontSize: 11, fontWeight: '700' }}>Status</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function getNextStatus(current: string) {
  const idx = KANBAN_COLUMNS.indexOf(current as any);
  if (idx >= 0 && idx < KANBAN_COLUMNS.length - 1) {
    return KANBAN_COLUMNS[idx + 1];
  }
  return null;
}

function SwipeableKanbanCard({
  app,
  col,
  onStatusChange,
  onReject,
  onResume,
}: {
  app: ApplicationDetailed;
  col: string;
  onStatusChange: (id: string, status: string) => void;
  onReject: (id: string) => void;
  onResume: (id: string) => void;
}) {
  const nextStatus = getNextStatus(col);

  const renderRightActions = () => {
    return (
      <View style={{ flexDirection: 'row', height: '100%', paddingBottom: 8 }}>
        {nextStatus && (
          <Pressable
            onPress={() => onStatusChange(app.id, nextStatus)}
            style={{
              backgroundColor: brand.accent,
              justifyContent: 'center',
              alignItems: 'center',
              width: 70,
            }}>
            <Text style={{ color: brand.bg, fontSize: 11, fontWeight: '700' }}>Advance</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => onReject(app.id)}
          style={{
            backgroundColor: brand.danger,
            justifyContent: 'center',
            alignItems: 'center',
            width: 60,
            borderTopRightRadius: 8,
            borderBottomRightRadius: 8,
          }}>
          <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>Reject</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} containerStyle={{ marginBottom: 8 }}>
      <View style={{ backgroundColor: brand.bg, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: brand.border }}>
        <Text style={{ color: brand.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
          {app.candidate_name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {matchLabel(app.match_score) ? (
            <Text style={{ color: brand.accent, fontSize: 11, fontWeight: '700' }}>{matchLabel(app.match_score)}</Text>
          ) : null}
          {app.resume_id ? (
            <Pressable onPress={() => onResume(app.id)}>
              <Text style={{ color: brand.text, fontSize: 11, textDecorationLine: 'underline' }}>View Resume</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={{ color: brand.muted, fontSize: 10, marginTop: 8 }}>
          ← Swipe left to manage
        </Text>
      </View>
    </Swipeable>
  );
}

export function RecruiterDashboard() {
  const { user } = useAuth();
  const dash = useRecruiterDashboard(user?.id, user?.role, user?.email);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'match'>('date');
  const [jobMode, setJobMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [jobForm, setJobForm] = useState(emptyJobForm);
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [companyEditing, setCompanyEditing] = useState(!dash.company);
  const [submitting, setSubmitting] = useState(false);
  const [suggestedJobId, setSuggestedJobId] = useState<string | null>(null);
  const [introSentTo, setIntroSentTo] = useState<Set<string>>(new Set());
  const [introSending, setIntroSending] = useState<string | null>(null);

  const statsByJob = useMemo(() => {
    const map = new Map<string, (typeof dash.jobStats)[0]>();
    dash.jobStats.forEach((s) => map.set(s.job_id, s));
    return map;
  }, [dash.jobStats]);

  useEffect(() => {
    if (dash.company) {
      setCompanyForm({
        name: dash.company.name ?? '',
        logo_url: dash.company.logo_url ?? '',
        website: dash.company.website ?? '',
        about: dash.company.about ?? '',
        industry: dash.company.industry ?? '',
        employee_size: dash.company.employee_size ?? '',
        head_office: dash.company.head_office ?? '',
        company_type: dash.company.company_type ?? '',
        since: dash.company.since != null ? String(dash.company.since) : '',
        specialization: Array.isArray(dash.company.specialization)
          ? dash.company.specialization.join(', ')
          : '',
      });
      setCompanyEditing(false);
    } else {
      setCompanyForm(emptyCompanyForm);
      setCompanyEditing(true);
    }
  }, [dash.company]);

  const filteredApplications = useMemo(() => {
    let list =
      statusFilter === 'all'
        ? dash.applications
        : dash.applications.filter((a) => a.status === statusFilter);
    list = [...list].sort((a, b) => {
      if (sortBy === 'match') {
        return (b.match_score ?? 0) - (a.match_score ?? 0);
      }
      return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
    });
    return list;
  }, [dash.applications, statusFilter, sortBy]);

  const buildJobPayload = (): CreateJobRequest | null => {
    if (!dash.companyId || !jobForm.position_title.trim()) return null;
    const minRaw = jobForm.salary_min ? parseInt(jobForm.salary_min.replace(/\D/g, ''), 10) : undefined;
    const maxRaw = jobForm.salary_max ? parseInt(jobForm.salary_max.replace(/\D/g, ''), 10) : undefined;
    return {
      company_id: dash.companyId,
      position_title: jobForm.position_title.trim(),
      location: jobForm.location,
      employment_type: jobForm.employment_type,
      salary_min: minRaw != null ? minRaw * 1000 : undefined,
      salary_max: maxRaw != null ? maxRaw * 1000 : undefined,
      salary_currency: jobForm.salary_currency,
      salary_period: jobForm.salary_period,
      description: jobForm.description.trim() || undefined,
      tags: jobForm.tags.trim() ? jobForm.tags.split(/[,\s]+/).filter(Boolean) : undefined,
    };
  };

  const resetJobForm = () => {
    setJobForm(emptyJobForm);
    setEditingJobId(null);
    setJobMode('list');
  };

  const startEditJob = (job: Job) => {
    setEditingJobId(job.id);
    setJobForm({
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
    setJobMode('edit');
  };

  const toggleSuggested = (jobId: string) => {
    if (suggestedJobId === jobId) {
      setSuggestedJobId(null);
      return;
    }
    setSuggestedJobId(jobId);
    dash.loadSuggestedCandidates(jobId);
  };

  const submitJob = async () => {
    const payload = buildJobPayload();
    if (!payload) return;
    setSubmitting(true);
    try {
      if (jobMode === 'edit' && editingJobId) {
        await dash.patchJob(editingJobId, {
          position_title: payload.position_title,
          location: payload.location,
          employment_type: payload.employment_type,
          salary_min: payload.salary_min,
          salary_max: payload.salary_max,
          salary_currency: payload.salary_currency,
          salary_period: payload.salary_period,
          description: payload.description,
          featured: dash.limits?.can_feature_jobs ? jobForm.featured : undefined,
        });
      } else {
        await dash.postJob(payload);
      }
      resetJobForm();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save job');
    } finally {
      setSubmitting(false);
    }
  };

  const submitCompany = async () => {
    if (!companyForm.name.trim()) {
      Alert.alert('Error', 'Company name is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateCompanyRequest = {
        name: companyForm.name.trim(),
        logo_url: companyForm.logo_url.trim() || undefined,
        website: companyForm.website.trim() || undefined,
        about: companyForm.about.trim() || undefined,
        industry: companyForm.industry.trim() || undefined,
        employee_size: companyForm.employee_size.trim() || undefined,
        head_office: companyForm.head_office.trim() || undefined,
        company_type: companyForm.company_type.trim() || undefined,
        since: companyForm.since ? parseInt(companyForm.since, 10) : undefined,
        specialization: companyForm.specialization.trim()
          ? companyForm.specialization.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
          : undefined,
      };
      await dash.saveCompany(payload, Boolean(dash.company));
      setCompanyEditing(false);
      await dash.refreshDashboard();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save company');
    } finally {
      setSubmitting(false);
    }
  };

  const renderJobPicker = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
      {dash.jobs.map((j) => {
        const stats = statsByJob.get(j.id);
        const active = dash.selectedJobId === j.id;
        return (
          <Pressable
            key={j.id}
            onPress={() => dash.setSelectedJobId(j.id)}
            style={{
              padding: 12,
              marginRight: 8,
              borderRadius: 12,
              minWidth: 160,
              backgroundColor: active ? brand.surface : brand.bg,
              borderWidth: 1,
              borderColor: active ? brand.accent : brand.border,
            }}>
            <Text style={{ color: brand.text, fontWeight: '600', fontSize: 13 }} numberOfLines={2}>
              {j.position_title}
            </Text>
            <Text style={{ color: brand.muted, fontSize: 11, marginTop: 4 }}>
              {stats?.application_count ?? 0} applicants
              {(stats?.new_count_7d ?? 0) > 0 ? ` · ${stats?.new_count_7d} new` : ''}
            </Text>
            {j.status === 'closed' ? (
              <Text style={{ color: brand.danger, fontSize: 10, fontWeight: '700', marginTop: 4 }}>CLOSED</Text>
            ) : null}
          </Pressable>
        );
      })}
      <Pressable
        onPress={() => dash.setSelectedJobId('UNIFIED')}
        style={{
          padding: 12,
          marginRight: 8,
          borderRadius: 12,
          minWidth: 160,
          backgroundColor: dash.selectedJobId === 'UNIFIED' ? brand.surface : brand.bg,
          borderWidth: 1,
          borderColor: dash.selectedJobId === 'UNIFIED' ? brand.accent : brand.border,
        }}>
        <Text style={{ color: brand.text, fontWeight: '600', fontSize: 13 }} numberOfLines={2}>
          Unified Inbox
        </Text>
        <Text style={{ color: brand.muted, fontSize: 11, marginTop: 4 }}>
          All companies
        </Text>
      </Pressable>
    </ScrollView>
  );

  const inputStyle = {
    backgroundColor: brand.surface,
    color: brand.text,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brand.border,
  } as const;

  if (dash.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: brand.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={brand.accent} />
      </View>
    );
  }

  return (
    <KeyboardAwareScreen screenClassName="flex-1 bg-[#2b2b2b]">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: brand.text, fontSize: 22, fontWeight: '700' }}>Recruiter dashboard</Text>
        <Text style={{ color: brand.muted, marginBottom: 12 }}>{user?.name || user?.email}</Text>

        {dash.myCompanies.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {dash.myCompanies.map(c => (
              <Pressable
                key={c.id}
                onPress={() => dash.setSelectedCompanyId(c.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  marginRight: 8,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: dash.selectedCompanyId === c.id ? brand.accent : brand.border,
                  backgroundColor: dash.selectedCompanyId === c.id ? brand.accent + '22' : brand.surface,
                }}>
                <Text style={{ color: dash.selectedCompanyId === c.id ? brand.accent : brand.text, fontWeight: '600', fontSize: 13 }}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                dash.setSelectedCompanyId('NEW_COMPANY');
                setCompanyEditing(true);
                setCompanyForm(emptyCompanyForm);
                dash.setActiveTab('company');
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                marginRight: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: brand.border,
                backgroundColor: brand.surface,
              }}>
              <Text style={{ color: brand.muted, fontWeight: '600', fontSize: 13 }}>+ New</Text>
            </Pressable>
          </ScrollView>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {TABS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => {
                setJobMode('list');
                dash.setActiveTab(t.id);
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                marginRight: 8,
                borderRadius: 8,
                backgroundColor: dash.activeTab === t.id ? brand.accent : brand.surface,
              }}>
              <Text style={{ color: dash.activeTab === t.id ? brand.bg : brand.text, fontWeight: '700', fontSize: 13 }}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {dash.activeTab === 'overview' && (
          <View style={{ gap: 12 }}>
            {!dash.companyId ? (
              <View style={{ padding: 20, borderRadius: 12, backgroundColor: brand.surface, alignItems: 'center', gap: 12 }}>
                <Text style={{ color: brand.text, fontWeight: '700', fontSize: 18, textAlign: 'center' }}>
                  Welcome to your recruiter dashboard
                </Text>
                <Text style={{ color: brand.muted, textAlign: 'center' }}>
                  Set up your company profile first, then post a job to start receiving applications.
                </Text>
                <Pressable
                  onPress={() => dash.setActiveTab('company')}
                  style={{ backgroundColor: brand.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}>
                  <Text style={{ color: brand.bg, fontWeight: '700' }}>Set up company</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {!dash.overview?.setup_complete ? (
                  <View
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: brand.accent + '55',
                      backgroundColor: brand.accent + '11',
                      gap: 8,
                    }}>
                    <Text style={{ color: brand.text, fontWeight: '700' }}>Complete your company profile</Text>
                    <Text style={{ color: brand.muted, fontSize: 12 }}>
                      Add a logo and about section so candidates trust your listings.
                    </Text>
                    <Pressable
                      onPress={() => dash.setActiveTab('company')}
                      style={{ alignSelf: 'flex-start', backgroundColor: brand.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}>
                      <Text style={{ color: brand.bg, fontWeight: '700', fontSize: 12 }}>Finish setup</Text>
                    </Pressable>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { l: 'Active jobs', v: dash.overview?.active_jobs ?? 0 },
                    { l: 'New (7d)', v: dash.overview?.new_applications_7d ?? 0 },
                    { l: 'Pending', v: dash.overview?.pending_review ?? 0 },
                    { l: 'Total apps', v: dash.overview?.total_applications ?? 0 },
                  ].map((s) => (
                    <View key={s.l} style={{ flex: 1, minWidth: 90, backgroundColor: brand.surface, padding: 12, borderRadius: 12 }}>
                      <Text style={{ color: brand.accent, fontSize: 22, fontWeight: '700' }}>{s.v}</Text>
                      <Text style={{ color: brand.muted, fontSize: 11 }}>{s.l}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Pressable
                    onPress={() => dash.setActiveTab('jobs')}
                    style={{ backgroundColor: brand.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}>
                    <Text style={{ color: brand.bg, fontWeight: '700', fontSize: 12 }}>Post a job</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => dash.setActiveTab('applications')}
                    style={{ borderWidth: 1, borderColor: brand.border, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}>
                    <Text style={{ color: brand.text, fontWeight: '700', fontSize: 12 }}>Review applications</Text>
                  </Pressable>
                </View>
                <Text style={{ color: brand.text, fontWeight: '700', fontSize: 16 }}>Recent applicants</Text>
                {(dash.overview?.recent_applications ?? []).length === 0 ? (
                  <Text style={{ color: brand.muted }}>No applications yet.</Text>
                ) : (
                  (dash.overview?.recent_applications ?? []).map((app) => (
                    <ApplicantCard
                      key={app.id}
                      app={app}
                      onShortlist={() => dash.updateApplicationStatus(app.id, 'shortlisted')}
                      onReject={() => dash.updateApplicationStatus(app.id, 'rejected')}
                      onViewResume={app.resume_id ? () => dash.downloadResume(app.id) : undefined}
                    />
                  ))
                )}
              </>
            )}
          </View>
        )}

        {dash.activeTab === 'applications' && dash.companyId && (
          <View style={{ gap: 12 }}>
            {renderJobPicker()}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pressable
                onPress={() => setSortBy(sortBy === 'date' ? 'match' : 'date')}
                style={{ padding: 8, borderRadius: 8, backgroundColor: brand.surface }}>
                <Text style={{ color: brand.accent, fontSize: 11 }}>
                  Sort: {sortBy === 'match' ? 'Best match' : 'Newest'}
                </Text>
              </Pressable>
              {(['all', ...APPLICATION_STATUSES] as const).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setStatusFilter(s)}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    backgroundColor: statusFilter === s ? brand.accent : brand.surface,
                  }}>
                  <Text style={{ color: statusFilter === s ? brand.bg : brand.text, fontSize: 11 }}>
                    {s === 'all' ? 'All' : s}
                  </Text>
                </Pressable>
              ))}
            </View>
            {dash.selectedJobId === 'UNIFIED' ? (
              dash.unifiedInbox.length === 0 ? (
                <Text style={{ color: brand.muted, textAlign: 'center', paddingVertical: 24 }}>
                  No recent applications across your companies.
                </Text>
              ) : (
                dash.unifiedInbox.map((app) => (
                  <ApplicantCard
                    key={app.id}
                    app={app}
                    onShortlist={() => dash.updateApplicationStatus(app.id, 'shortlisted')}
                    onReject={() => dash.updateApplicationStatus(app.id, 'rejected')}
                    onViewResume={app.resume_id ? () => dash.downloadResume(app.id) : undefined}
                    onChangeStatus={(status) => dash.updateApplicationStatus(app.id, status)}
                  />
                ))
              )
            ) : dash.applicationsLoading ? (
              <ActivityIndicator color={brand.accent} />
            ) : filteredApplications.length === 0 ? (
              <Text style={{ color: brand.muted, textAlign: 'center', paddingVertical: 24 }}>
                {dash.selectedJobId ? 'No applications for this filter.' : 'Select a job to view applicants.'}
              </Text>
            ) : (
              filteredApplications.map((app) => (
                <ApplicantCard
                  key={app.id}
                  app={app}
                  onShortlist={() => dash.updateApplicationStatus(app.id, 'shortlisted')}
                  onReject={() => dash.updateApplicationStatus(app.id, 'rejected')}
                  onViewResume={app.resume_id ? () => dash.downloadResume(app.id) : undefined}
                  onChangeStatus={(status) => dash.updateApplicationStatus(app.id, status)}
                />
              ))
            )}
          </View>
        )}

        {dash.activeTab === 'kanban' && dash.companyId && (
          <View style={{ gap: 12 }}>
            {renderJobPicker()}
            {dash.applicationsLoading ? (
              <ActivityIndicator color={brand.accent} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {KANBAN_COLUMNS.map((col) => {
                  const cards = dash.applications.filter((a) => a.status === col);
                  return (
                    <View
                      key={col}
                      style={{
                        width: 220,
                        marginRight: 12,
                        backgroundColor: brand.surface,
                        borderRadius: 12,
                        padding: 10,
                        minHeight: 180,
                      }}>
                      <Text style={{ color: brand.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 }}>
                        {col} ({cards.length})
                      </Text>
                      {cards.map((app) => (
                        <SwipeableKanbanCard
                          key={app.id}
                          app={app}
                          col={col}
                          onStatusChange={dash.updateApplicationStatus}
                          onReject={(id) => dash.updateApplicationStatus(id, 'rejected')}
                          onResume={dash.downloadResume}
                        />
                      ))}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {dash.activeTab === 'jobs' && (
          <View style={{ gap: 12 }}>
            {!dash.companyId ? (
              <Text style={{ color: brand.accent }}>Create your company profile before posting jobs.</Text>
            ) : jobMode === 'list' ? (
              <>
                {dash.limits ? (
                  <View style={{ padding: 12, borderRadius: 12, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border }}>
                    <Text style={{ color: brand.muted, fontSize: 12 }}>
                      {dash.limits.is_premium
                        ? 'Premium: unlimited active jobs · featured listings enabled.'
                        : `Free plan: ${dash.limits.active_jobs} of ${dash.limits.free_active_jobs_limit} active jobs used.`}
                    </Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: brand.text, fontWeight: '700', fontSize: 18 }}>Your job posts</Text>
                  <Pressable
                    disabled={dash.limits?.can_create_job === false}
                    onPress={() => {
                      setJobForm(emptyJobForm);
                      setJobMode('create');
                    }}
                    style={{
                      backgroundColor: brand.accent,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 8,
                      opacity: dash.limits?.can_create_job === false ? 0.4 : 1,
                    }}>
                    <Text style={{ color: brand.bg, fontWeight: '700', fontSize: 12 }}>+ New job</Text>
                  </Pressable>
                </View>
                {dash.jobs.length === 0 ? (
                  <Text style={{ color: brand.muted, textAlign: 'center', paddingVertical: 24 }}>
                    No jobs yet. Post your first opening.
                  </Text>
                ) : (
                  dash.jobs.map((j) => (
                    <View key={j.id} style={{ backgroundColor: brand.surface, padding: 14, borderRadius: 12, gap: 8 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: brand.text, fontWeight: '700' }}>{j.position_title}</Text>
                        {j.featured ? (
                          <View style={{ backgroundColor: brand.accent + '22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                            <Text style={{ color: brand.accent, fontSize: 10, fontWeight: '700' }}>FEATURED</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={{ color: brand.muted, fontSize: 12 }}>
                        {j.location} · {j.employment_type}
                        {j.status === 'closed' ? ' · Closed' : ''}
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        <Pressable onPress={() => toggleSuggested(j.id)}>
                          <Text style={{ color: brand.accent, fontSize: 12, fontWeight: '700' }}>
                            {suggestedJobId === j.id ? 'Hide matches' : 'AI matches'}
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => startEditJob(j)}>
                          <Text style={{ color: brand.accent, fontSize: 12, fontWeight: '700' }}>Edit</Text>
                        </Pressable>
                        <Pressable onPress={() => dash.duplicateJobPost(j.id)}>
                          <Text style={{ color: brand.accent, fontSize: 12, fontWeight: '700' }}>Duplicate</Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            dash.patchJob(j.id, { status: j.status === 'closed' ? 'active' : 'closed' })
                          }>
                          <Text style={{ color: brand.accent, fontSize: 12, fontWeight: '700' }}>
                            {j.status === 'closed' ? 'Reopen' : 'Close'}
                          </Text>
                        </Pressable>
                        {dash.limits?.can_feature_jobs && j.status !== 'closed' ? (
                          <Pressable onPress={() => dash.patchJob(j.id, { featured: !j.featured })}>
                            <Text style={{ color: brand.accent, fontSize: 12, fontWeight: '700' }}>
                              {j.featured ? 'Unfeature' : 'Feature'}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                      {suggestedJobId === j.id ? (
                        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: brand.border, gap: 8 }}>
                          <Text style={{ color: brand.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                            Suggested candidates
                          </Text>
                          {dash.suggestedLoading ? (
                            <ActivityIndicator color={brand.accent} />
                          ) : dash.suggestedCandidates.length === 0 ? (
                            <Text style={{ color: brand.muted, fontSize: 12 }}>No matching candidates yet.</Text>
                          ) : (
                            dash.suggestedCandidates.map((c: SuggestedCandidate) => (
                              <View key={c.user_id} style={{ backgroundColor: brand.bg, padding: 10, borderRadius: 8, gap: 4 }}>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                                  <Text style={{ color: brand.text, fontWeight: '700', fontSize: 13 }}>{c.candidate_name}</Text>
                                  <Text style={{ color: brand.accent, fontSize: 10, fontWeight: '700' }}>
                                    {Math.round(c.match_score * 100)}% match
                                  </Text>
                                  {c.already_applied ? (
                                    <Text style={{ color: brand.muted, fontSize: 10 }}>Applied</Text>
                                  ) : introSentTo.has(c.user_id) ? (
                                    <Text style={{ color: brand.muted, fontSize: 10 }}>Intro sent</Text>
                                  ) : (
                                    <Pressable
                                      disabled={introSending === c.user_id}
                                      onPress={async () => {
                                        setIntroSending(c.user_id);
                                        try {
                                          await dash.requestIntro(j.id, c.user_id);
                                          setIntroSentTo((prev) => new Set(prev).add(c.user_id));
                                        } catch {
                                          // toast already handled in the hook
                                        } finally {
                                          setIntroSending(null);
                                        }
                                      }}
                                      style={{
                                        paddingHorizontal: 8,
                                        paddingVertical: 3,
                                        borderRadius: 8,
                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                      }}>
                                      <Text style={{ color: brand.accent, fontSize: 10, fontWeight: '700' }}>
                                        {introSending === c.user_id ? 'Sending…' : 'Request intro'}
                                      </Text>
                                    </Pressable>
                                  )}
                                </View>
                                <Text style={{ color: brand.muted, fontSize: 11 }}>{c.candidate_email}</Text>
                              </View>
                            ))
                          )}
                        </View>
                      ) : null}
                    </View>
                  ))
                )}
              </>
            ) : (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: brand.text, fontWeight: '700', fontSize: 18 }}>
                    {jobMode === 'edit' ? 'Edit job' : 'Post a new job'}
                  </Text>
                  <Pressable onPress={resetJobForm}>
                    <Text style={{ color: brand.muted, fontSize: 12 }}>Cancel</Text>
                  </Pressable>
                </View>
                {jobMode === 'create' ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                    {JOB_TEMPLATES.map((t) => (
                      <Pressable
                        key={t.id}
                        onPress={() =>
                          setJobForm({
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
                          })
                        }
                        style={{
                          marginRight: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: brand.accent + '55',
                        }}>
                        <Text style={{ color: brand.accent, fontSize: 11, fontWeight: '700' }}>{t.label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}
                <TextInput
                  value={jobForm.position_title}
                  onChangeText={(v) => setJobForm((f) => ({ ...f, position_title: v }))}
                  placeholder="Job title"
                  placeholderTextColor={brand.muted}
                  style={inputStyle}
                />
                <TextInput
                  value={jobForm.location}
                  onChangeText={(v) => setJobForm((f) => ({ ...f, location: v }))}
                  placeholder="Location (Remote, Onsite, Hybrid)"
                  placeholderTextColor={brand.muted}
                  style={inputStyle}
                />
                <TextInput
                  value={jobForm.employment_type}
                  onChangeText={(v) => setJobForm((f) => ({ ...f, employment_type: v }))}
                  placeholder={`Employment type (${EMPLOYMENT_TYPES.join(', ')})`}
                  placeholderTextColor={brand.muted}
                  style={inputStyle}
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={jobForm.salary_min}
                    onChangeText={(v) => setJobForm((f) => ({ ...f, salary_min: v.replace(/\D/g, '') }))}
                    placeholder="Min K"
                    placeholderTextColor={brand.muted}
                    keyboardType="number-pad"
                    style={[inputStyle, { flex: 1 }]}
                  />
                  <TextInput
                    value={jobForm.salary_max}
                    onChangeText={(v) => setJobForm((f) => ({ ...f, salary_max: v.replace(/\D/g, '') }))}
                    placeholder="Max K"
                    placeholderTextColor={brand.muted}
                    keyboardType="number-pad"
                    style={[inputStyle, { flex: 1 }]}
                  />
                </View>
                <TextInput
                  value={jobForm.salary_currency}
                  onChangeText={(v) => setJobForm((f) => ({ ...f, salary_currency: v.toUpperCase() }))}
                  placeholder={`Currency (${SALARY_CURRENCIES.join(', ')})`}
                  placeholderTextColor={brand.muted}
                  style={inputStyle}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: brand.muted, fontSize: 12 }}>Description</Text>
                  <Pressable onPress={() => setJobForm((f) => ({ ...f, description: DEFAULT_JOB_DESC_PLACEHOLDER }))}>
                    <Text style={{ color: brand.accent, fontSize: 11 }}>Use template</Text>
                  </Pressable>
                </View>
                <TextInput
                  value={jobForm.description}
                  onChangeText={(v) => setJobForm((f) => ({ ...f, description: v }))}
                  placeholder="Job description"
                  placeholderTextColor={brand.muted}
                  multiline
                  style={[inputStyle, { minHeight: 120, textAlignVertical: 'top' }]}
                />
                <TextInput
                  value={jobForm.tags}
                  onChangeText={(v) => setJobForm((f) => ({ ...f, tags: v }))}
                  placeholder="Skills / tags (comma separated)"
                  placeholderTextColor={brand.muted}
                  style={inputStyle}
                />
                {jobMode === 'edit' && dash.limits?.can_feature_jobs ? (
                  <Pressable
                    onPress={() => setJobForm((f) => ({ ...f, featured: !f.featured }))}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        borderWidth: 1,
                        borderColor: brand.accent,
                        backgroundColor: jobForm.featured ? brand.accent : 'transparent',
                      }}
                    />
                    <Text style={{ color: brand.text, fontSize: 13 }}>Feature this job in listings</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={submitJob}
                  disabled={submitting}
                  style={{ backgroundColor: brand.accent, padding: 14, borderRadius: 12, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}>
                  <Text style={{ color: brand.bg, fontWeight: '700' }}>
                    {submitting ? 'Saving…' : jobMode === 'edit' ? 'Save changes' : 'Publish job'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {dash.activeTab === 'company' && (
          <View style={{ gap: 12 }}>
            {dash.company && !companyEditing ? (
              <>
                <Text style={{ color: brand.text, fontWeight: '700', fontSize: 18 }}>{dash.company.name}</Text>
                {dash.company.about ? (
                  <Text style={{ color: brand.muted, fontSize: 13 }}>{dash.company.about}</Text>
                ) : null}
                <Pressable
                  onPress={() => setCompanyEditing(true)}
                  style={{ backgroundColor: brand.accent, padding: 14, borderRadius: 12, alignItems: 'center' }}>
                  <Text style={{ color: brand.bg, fontWeight: '700' }}>Edit company</Text>
                </Pressable>
              </>
            ) : (
              <>
                {(
                  [
                    ['name', 'Company name'],
                    ['logo_url', 'Logo URL'],
                    ['website', 'Website'],
                    ['industry', 'Industry'],
                    ['employee_size', 'Employee size'],
                    ['head_office', 'Head office'],
                    ['company_type', 'Company type'],
                    ['since', 'Founded year'],
                    ['specialization', 'Specialization (comma separated)'],
                  ] as const
                ).map(([key, label]) => (
                  <View key={key}>
                    <Text style={{ color: brand.muted, fontSize: 12, marginBottom: 4 }}>{label}</Text>
                    <TextInput
                      value={companyForm[key]}
                      onChangeText={(v) => setCompanyForm((f) => ({ ...f, [key]: v }))}
                      placeholder={label}
                      placeholderTextColor={brand.muted}
                      style={inputStyle}
                    />
                  </View>
                ))}
                <Text style={{ color: brand.muted, fontSize: 12, marginBottom: 4 }}>About</Text>
                <TextInput
                  value={companyForm.about}
                  onChangeText={(v) => setCompanyForm((f) => ({ ...f, about: v }))}
                  placeholder="About your company"
                  placeholderTextColor={brand.muted}
                  multiline
                  style={[inputStyle, { minHeight: 100, textAlignVertical: 'top' }]}
                />
                <Pressable
                  onPress={submitCompany}
                  disabled={submitting}
                  style={{ backgroundColor: brand.accent, padding: 14, borderRadius: 12, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}>
                  <Text style={{ color: brand.bg, fontWeight: '700' }}>
                    {submitting ? 'Saving…' : dash.company ? 'Save company' : 'Create company'}
                  </Text>
                </Pressable>
                {dash.company ? (
                  <Pressable onPress={() => setCompanyEditing(false)}>
                    <Text style={{ color: brand.muted, textAlign: 'center' }}>Cancel</Text>
                  </Pressable>
                ) : (
                  dash.myCompanies.length > 0 && (
                    <Pressable onPress={() => {
                      setCompanyEditing(false);
                      dash.setSelectedCompanyId(dash.myCompanies[0].id);
                    }}>
                      <Text style={{ color: brand.muted, textAlign: 'center' }}>Cancel</Text>
                    </Pressable>
                  )
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAwareScreen>
  );
}
