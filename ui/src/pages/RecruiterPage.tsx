import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRecruiterDashboard } from '../hooks/useRecruiterDashboard';
import { getErrorMessage, notifyError, notifySuccess } from '../lib/toast';
import RecruiterSidebar from '../components/recruiter/RecruiterSidebar';
import RecruiterOverviewTab from '../components/recruiter/RecruiterOverviewTab';
import RecruiterInboxTab from '../components/recruiter/RecruiterInboxTab';
import RecruiterJobsTab from '../components/recruiter/RecruiterJobsTab';
import RecruiterKanbanTab from '../components/recruiter/RecruiterKanbanTab';
import RecruiterCompanyTab from '../components/recruiter/RecruiterCompanyTab';
import RecruiterTalentPoolsTab from '../components/recruiter/RecruiterTalentPoolsTab';
import RecruiterBulkUploadTab from '../components/recruiter/RecruiterBulkUploadTab';
import RecruiterGuidesTab from '../components/recruiter/RecruiterGuidesTab';
import { useEffect } from 'react';

const RecruiterPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const dash = useRecruiterDashboard(user?.id, user?.role);

  useEffect(() => {
    if (user && user.role !== 'recruiter' && user.role !== 'admin') {
      navigate('/profile', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (dash.companyId) {
      void dash.refreshDashboard();
    }
  }, [user?.subscription?.is_premium, dash.companyId, dash.refreshDashboard]);

  const handleLogout = async () => {
    await logout();
    notifySuccess('Logged out successfully.');
  };

  const handleShortlist = (id: string) => {
    dash.updateApplicationStatus(id, 'shortlisted').catch((e) =>
      notifyError(getErrorMessage(e, 'Failed to update status.'))
    );
  };

  const handleReject = (id: string) => {
    dash.updateApplicationStatus(id, 'rejected').catch((e) =>
      notifyError(getErrorMessage(e, 'Failed to update status.'))
    );
  };

  if (dash.loading) {
    return (
      <div className="min-h-screen bg-[#2b2b2b] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#fcc636] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Recruiter Dashboard - Kraftisium</title>
        <meta name="description" content="Manage job posts and applications on Kraftisium." />
      </Helmet>

      <div className="min-h-screen bg-[#2b2b2b] text-white py-12 px-4 md:px-16">
        <div className="container mx-auto flex flex-col lg:flex-row gap-10 items-start">
          <RecruiterSidebar
            activeTab={dash.activeTab}
            onTabChange={dash.setActiveTab}
            userName={user?.name}
            onLogout={() => void handleLogout()}
            myCompanies={dash.myCompanies}
            selectedCompanyId={dash.selectedCompanyId}
            onCompanyChange={(id) => {
            dash.setSelectedCompanyId(id);
            if (id === 'NEW_COMPANY') {
              dash.setActiveTab('settings');
            }
          }}
          />

          <div className="flex-grow w-full min-w-0">
            {dash.activeTab === 'overview' && (
              <RecruiterOverviewTab
                overview={dash.overview}
                hasCompany={Boolean(dash.companyId)}
                onGoTab={(tab) => dash.setActiveTab(tab)}
                onShortlist={handleShortlist}
                onReject={handleReject}
                onViewResume={(id) => void dash.downloadResume(id)}
                onStatusChange={(id, status) => {
                  dash.updateApplicationStatus(id, status).catch((e) =>
                    notifyError(getErrorMessage(e, 'Failed to update status.'))
                  );
                }}
              />
            )}

            {dash.activeTab === 'applicants' && (
              <RecruiterInboxTab
                inbox={dash.unifiedInbox}
                loading={dash.applicationsLoading}
                onShortlist={handleShortlist}
                onReject={handleReject}
                onViewResume={(id) => void dash.downloadResume(id)}
                onStatusChange={(id, status) => {
                  dash.updateApplicationStatus(id, status).catch((e) =>
                    notifyError(getErrorMessage(e, 'Failed to update status.'))
                  );
                }}
              />
            )}

            {dash.activeTab === 'jobs' && (
              <div className="space-y-12">
                <RecruiterJobsTab
                  companyId={dash.companyId}
                  jobs={dash.jobs}
                  limits={dash.limits}
                  suggestedCandidates={dash.suggestedCandidates}
                  suggestedLoading={dash.suggestedLoading}
                  onLoadSuggested={(jobId) => void dash.loadSuggestedCandidates(jobId)}
                  onCreateJob={async (p) => { await dash.postJob(p); }}
                  onUpdateJob={async (id, data) => { await dash.patchJob(id, data); }}
                  onDuplicateJob={async (id) => { await dash.duplicateJobPost(id); }}
                  onRequestIntro={async (jobId, candidateUserId, note) => { await dash.requestIntro(jobId, candidateUserId, note); }}
                  onGoToBulkUpload={(jobId) => {
                    dash.setSelectedJobId(jobId);
                    dash.setActiveTab('sourcing');
                  }}
                />
              </div>
            )}

            {dash.activeTab === 'pipeline' && (
              <div className="space-y-12">
                <RecruiterKanbanTab
                  jobs={dash.jobs}
                  selectedJobId={dash.selectedJobId}
                  onSelectJob={dash.setSelectedJobId}
                  applications={dash.applications}
                  loading={dash.applicationsLoading}
                  onStatusChange={(id, status) => {
                    dash.updateApplicationStatus(id, status).catch((e) =>
                      notifyError(getErrorMessage(e, 'Failed to update status.'))
                    );
                  }}
                  onViewResume={(id) => void dash.downloadResume(id)}
                />
              </div>
            )}

            {dash.activeTab === 'sourcing' && (
              <div className="space-y-12">
                <RecruiterTalentPoolsTab
                  companyId={dash.companyId}
                  jobs={dash.jobs}
                />
                
                <div className="h-px w-full bg-white/10" />

                <RecruiterBulkUploadTab
                  companyId={dash.companyId}
                  jobs={dash.jobs}
                  initialJobId={dash.selectedJobId}
                />
              </div>
            )}

            {dash.activeTab === 'settings' && (
              <div className="space-y-12">
                <RecruiterCompanyTab
                  company={dash.company}
                  onSave={async (payload, isEdit) => {
                    await dash.saveCompany(payload, isEdit);
                    await dash.refreshDashboard();
                  }}
                  onCreateNew={() => dash.setSelectedCompanyId('NEW_COMPANY')}
                  onCancel={dash.myCompanies.length > 0 ? () => dash.setSelectedCompanyId(dash.myCompanies[0].id) : undefined}
                />
              </div>
            )}

            {dash.activeTab === 'guides' && (
              <div className="space-y-12">
                <RecruiterGuidesTab />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default RecruiterPage;
