import * as DocumentPicker from 'expo-document-picker';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';

import { brand } from '@/constants/brand';
import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import JobCardSkeleton from '@/components/JobCardSkeleton';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/services/authApi';
import { bffApi, type Resume, type ApplicationDetailed } from '@/services/bffApi';
import { subscriptionApi } from '@/services/subscriptionApi';
import { getAccessToken } from '@/lib/auth-storage';
import { buildReferralLink } from '@/lib/promoCode';
import type { ReferralSettings } from '@/types/subscription';
import { timeAgo } from '@/utils/jobFormat';

const BIO_PLACEHOLDER = `## About Me
2-3 sentences about your background.

## Key Skills
• Skill 1

## Career Goals
• Goal 1`;

export default function ProfileScreen() {
  const { user, logout, refreshUser, clearSession, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'view' | 'edit' | 'settings' | 'applications'>('view');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState('');
  const [resumeSuccess, setResumeSuccess] = useState('');
  const [userApplications, setUserApplications] = useState<any[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [referralSettings, setReferralSettings] = useState<ReferralSettings | null>(null);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  useEffect(() => {
    subscriptionApi.getReferralSettings().then(setReferralSettings).catch(() => setReferralSettings(null));
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    if (user.role === 'recruiter' || user.role === 'admin') return;
    (async () => {
      setResumeLoading(true);
      setResumeError('');
      try {
        const list = await bffApi.getResumes(user.id);
        setResumes(list);
      } catch (e) {
        setResumeError(e instanceof Error ? e.message : 'Failed to load resumes');
      } finally {
        setResumeLoading(false);
      }
    })();
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!user?.id || user.role === 'recruiter' || user.role === 'admin') return;
    (async () => {
      setAppsLoading(true);
      try {
        const apps = await bffApi.getMyApplications(user.id);
        setUserApplications(apps);
      } catch (e) {
        console.error(e);
      } finally {
        setAppsLoading(false);
      }
    })();
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!user?.id || (user.role !== 'user' && user.role !== 'admin')) return;
    bffApi
      .getCandidateProfile()
      .then((p) => {
        if (p) setBio(p.bio ?? '');
        else bffApi.upsertCandidateProfile({}).catch(() => {});
      })
      .catch(() => {});
  }, [user?.id, user?.role]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#2b2b2b]">
        <ActivityIndicator color={brand.accent} />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/login" />;
  }

  if (user.role === 'recruiter' || user.role === 'admin') {
    return <Redirect href="/(tabs)/recruiter" />;
  }

  const saveProfile = async () => {
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);
    try {
      await authApi.updateProfile({ name });
      await bffApi.upsertCandidateProfile({ bio: bio.trim() });
      await refreshUser();
      setProfileSuccess('Profile updated');
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setProfileLoading(false);
    }
  };

  const changePassword = async () => {
    setPwdError('');
    setPwdSuccess('');
    if (pwd.next.length < 8) {
      setPwdError('New password must be at least 8 characters');
      return;
    }
    if (pwd.next !== pwd.confirm) {
      setPwdError('Passwords do not match');
      return;
    }
    setPwdLoading(true);
    try {
      await authApi.changePassword({
        current_password: pwd.current,
        new_password: pwd.next,
      });
      setPwdSuccess('Password changed');
      setPwd({ current: '', next: '', confirm: '' });
    } catch (e) {
      setPwdError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPwdLoading(false);
    }
  };

  const deleteAccount = async () => {
    setDeleteError('');
    if (deleteConfirm !== 'DELETE') {
      setDeleteError('Type DELETE to confirm');
      return;
    }
    setDeleteLoading(true);
    try {
      await authApi.deleteAccount();
      await clearSession();
      router.replace('/account-deleted');
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  const pickResume = async () => {
    if (!user.id) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.size != null && asset.size > 5 * 1024 * 1024) {
      setResumeError('Max file size 5MB');
      return;
    }
    setResumeError('');
    setResumeSuccess('');
    setResumeUploading(true);
    try {
      await bffApi.uploadResume(user.id, {
        uri: asset.uri,
        name: asset.name || 'resume.pdf',
        mimeType: asset.mimeType || undefined,
      });
      setResumeSuccess('Resume uploaded');
      const list = await bffApi.getResumes(user.id);
      setResumes(list);
      bffApi.refreshSuggestedJobs(user.id).catch(() => {});
    } catch (e) {
      setResumeError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setResumeUploading(false);
    }
  };

  const handleRedeemCredits = async () => {
    const token = await getAccessToken();
    if (!token) return;

    try {
      setIsRedeeming(true);
      const res = await subscriptionApi.redeemCredits(token);
      alert(res.message);
      await refreshUser();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to redeem credits');
    } finally {
      setIsRedeeming(false);
    }
  };

  const tabBtn = (t: typeof activeTab, label: string) => (
    <Pressable
      key={t}
      onPress={() => setActiveTab(t)}
      className="mr-2 rounded-lg px-4 py-3"
      style={{
        backgroundColor: activeTab === t ? brand.surface : brand.accent,
        borderWidth: activeTab === t ? 1 : 0,
        borderColor: brand.accent,
      }}>
      <Text className="font-bold" style={{ color: activeTab === t ? brand.accent : brand.bg }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <KeyboardAwareScreen
      screenClassName="flex-1 bg-[#2b2b2b]"
      contentClassName="px-4 py-6">
      <Pressable onPress={() => router.back()}>
        <Text style={{ color: brand.accent }}>← Back</Text>
      </Pressable>

      <View className="mt-4 flex-row flex-wrap gap-y-2">{tabBtn('view', 'View')}{tabBtn('edit', 'Edit')}{tabBtn('applications', 'Applications')}{tabBtn('settings', 'Settings')}</View>

      {activeTab === 'view' && (
        <View className="mt-6 gap-4">
          <View className="rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
            <Text className="text-sm text-white/50">Name</Text>
            <Text className="text-lg text-white">{user.name}</Text>
          </View>
          <View className="rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
            <Text className="text-sm text-white/50">Email</Text>
            <Text className="text-lg text-white">{user.email}</Text>
          </View>
          <View className="rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
            <Text className="text-sm text-white/50">Bio</Text>
            <Text className="text-base text-white/80">{bio || 'No bio yet.'}</Text>
          </View>
          <View className="rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
            <Text className="text-sm text-white/50">Resume</Text>
            {resumeError ? <Text className="text-red-400">{resumeError}</Text> : null}
            {resumeLoading ? (
              <ActivityIndicator color={brand.accent} />
            ) : resumes.length === 0 ? (
              <Text className="text-white/50">No resumes yet.</Text>
            ) : (
              <Text className="text-white">{resumes[0].file_name || resumes[0].title}</Text>
            )}
          </View>

          <View className="rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
            <Text className="text-sm font-bold text-white mb-3">Earn Premium with Referrals</Text>
            
            {user.is_premium_candidate && (
              <View className="mb-4 border-b border-white/10 pb-4">
                <Text className="text-sm font-bold" style={{ color: brand.accent }}>⭐ Legacy Premium Candidate</Text>
                <Text className="text-xs text-white/50">Your profile is bumped to the top of recruiter searches!</Text>
              </View>
            )}

            <View className="rounded-lg bg-[#2b2b2b] p-3 mb-4 border border-white/5 gap-2">
              <View className="flex-row items-start gap-2 pr-4">
                <View className="h-1.5 w-1.5 rounded-full mt-1.5" style={{ backgroundColor: brand.accent }} />
                <Text className="text-xs text-white/70">
                  Share your link. When a friend signs up and uploads a resume, you earn <Text style={{ color: brand.accent, fontWeight: 'bold' }}>{referralSettings?.credits_per_referral ?? '—'} credits</Text>.
                </Text>
              </View>
              <View className="flex-row items-start gap-2 pr-4">
                <View className="h-1.5 w-1.5 rounded-full mt-1.5" style={{ backgroundColor: brand.accent }} />
                <Text className="text-xs text-white/70">
                  Redeem <Text style={{ color: brand.accent, fontWeight: 'bold' }}>{referralSettings?.credits_required_for_redemption ?? '—'} credits</Text> for {referralSettings?.redemption_premium_months === 1 ? '1 free month' : `${referralSettings?.redemption_premium_months ?? '—'} free months`} of Premium.
                </Text>
              </View>
            </View>

            <View className="flex-row items-end justify-between mt-2">
              <View>
                <Text className="text-xs text-white/50 mb-1">Your Balance</Text>
                <Text className="text-2xl font-bold" style={{ color: brand.accent }}>
                  {user.referral_credits || 0} <Text className="text-sm text-white/50">Credits</Text>
                </Text>
              </View>

              <Pressable
                onPress={handleRedeemCredits}
                disabled={isRedeeming || referralSettings == null || (user.referral_credits || 0) < referralSettings.credits_required_for_redemption}
                className="rounded-lg px-4 py-2"
                style={{
                  backgroundColor: brand.accent,
                  opacity: (isRedeeming || referralSettings == null || (user.referral_credits || 0) < referralSettings.credits_required_for_redemption) ? 0.5 : 1
                }}>
                <Text className="font-bold text-[#2b2b2b]">
                  {isRedeeming ? '...' : `Redeem ${referralSettings?.credits_required_for_redemption ?? ''}`}
                </Text>
              </Pressable>
            </View>

            {user.referral_code ? (
              <View className="mt-4 pt-4 border-t border-white/10 gap-3">
                <Text className="text-xs text-white/50">Your invite link:</Text>
                <Text className="text-xs text-white/70" selectable>
                  {buildReferralLink(user.referral_code)}
                </Text>
                <Pressable
                  onPress={() =>
                    void Share.share({
                      message: `Join Kraftisium with my link: ${buildReferralLink(user.referral_code!)}`,
                      url: buildReferralLink(user.referral_code!),
                    })
                  }
                  className="self-start rounded-lg px-4 py-2"
                  style={{ backgroundColor: brand.accent }}>
                  <Text className="font-bold text-[#2b2b2b]">Share invite link</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      )}

      {activeTab === 'edit' && (
        <View className="mt-6 gap-4 rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
          {profileError ? <Text className="text-red-400">{profileError}</Text> : null}
          {profileSuccess ? <Text className="text-green-400">{profileSuccess}</Text> : null}
          <Text className="text-sm text-white/80">Name</Text>
          <TextInput
            className="rounded-lg border border-white/10 bg-[#2b2b2b] px-3 py-3 text-white"
            value={name}
            onChangeText={setName}
          />
          <View className="flex-row justify-between">
            <Text className="text-sm text-white/80">Bio</Text>
            <Pressable onPress={() => setBio(BIO_PLACEHOLDER)}>
              <Text style={{ color: brand.accent }}>Use template</Text>
            </Pressable>
          </View>
          <TextInput
            className="min-h-[160px] rounded-lg border border-white/10 bg-[#2b2b2b] px-3 py-3 text-white"
            multiline
            value={bio}
            onChangeText={setBio}
            placeholderTextColor="#666"
            placeholder={BIO_PLACEHOLDER}
          />
          <Text className="text-sm text-white/80">Resume (PDF or text, max 5MB)</Text>
          {resumeError ? <Text className="text-red-400">{resumeError}</Text> : null}
          {resumeSuccess ? <Text className="text-green-400">{resumeSuccess}</Text> : null}
          <Pressable
            onPress={pickResume}
            disabled={resumeUploading}
            className="items-center rounded-xl py-4"
            style={{ backgroundColor: brand.surface2 }}>
            <Text className="font-bold text-white">{resumeUploading ? 'Uploading…' : 'Choose file'}</Text>
          </Pressable>
          <Pressable
            onPress={saveProfile}
            disabled={profileLoading}
            className="items-center rounded-xl py-4"
            style={{ backgroundColor: brand.accent }}>
            <Text className="font-bold" style={{ color: brand.bg }}>
              {profileLoading ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        </View>
      )}

      {activeTab === 'settings' && (
        <View className="mt-6 gap-4 rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
          <Text className="text-lg font-bold text-white">Change password</Text>
          {pwdError ? <Text className="text-red-400">{pwdError}</Text> : null}
          {pwdSuccess ? <Text className="text-green-400">{pwdSuccess}</Text> : null}
          <TextInput
            className="rounded-lg border border-white/10 bg-[#2b2b2b] px-3 py-3 text-white"
            placeholder="Current password"
            placeholderTextColor="#888"
            secureTextEntry
            value={pwd.current}
            onChangeText={(v) => setPwd((p) => ({ ...p, current: v }))}
          />
          <TextInput
            className="rounded-lg border border-white/10 bg-[#2b2b2b] px-3 py-3 text-white"
            placeholder="New password"
            placeholderTextColor="#888"
            secureTextEntry
            value={pwd.next}
            onChangeText={(v) => setPwd((p) => ({ ...p, next: v }))}
          />
          <TextInput
            className="rounded-lg border border-white/10 bg-[#2b2b2b] px-3 py-3 text-white"
            placeholder="Confirm new password"
            placeholderTextColor="#888"
            secureTextEntry
            value={pwd.confirm}
            onChangeText={(v) => setPwd((p) => ({ ...p, confirm: v }))}
          />
          <Pressable
            onPress={changePassword}
            disabled={pwdLoading}
            className="items-center rounded-xl py-4"
            style={{ backgroundColor: brand.accent }}>
            <Text className="font-bold" style={{ color: brand.bg }}>
              {pwdLoading ? 'Updating…' : 'Change password'}
            </Text>
          </Pressable>

          <View className="mt-4 gap-3 border-t border-red-500/30 pt-4">
            <Text className="text-lg font-bold text-white">Delete account</Text>
            <Text className="text-sm text-white/50">
              Signs you out immediately. You can register again later with the same email as a new account.
            </Text>
            <Pressable onPress={() => Linking.openURL('https://kraftisium.xyz/delete-account')}>
              <Text className="text-sm underline" style={{ color: brand.accent }}>
                What happens to your data
              </Text>
            </Pressable>
            {deleteError ? <Text className="text-red-400">{deleteError}</Text> : null}
            <TextInput
              className="rounded-lg border border-white/10 bg-[#2b2b2b] px-3 py-3 text-white"
              placeholder="Type DELETE to confirm"
              placeholderTextColor="#888"
              autoCapitalize="characters"
              value={deleteConfirm}
              onChangeText={setDeleteConfirm}
            />
            <Pressable
              onPress={deleteAccount}
              disabled={deleteLoading || deleteConfirm !== 'DELETE'}
              className="items-center rounded-xl py-4 bg-red-600 disabled:opacity-50">
              <Text className="font-bold text-white">
                {deleteLoading ? 'Deleting…' : 'Delete my account'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {activeTab === 'applications' && (
        <View className="mt-6 gap-4">
          <Text className="text-xl font-bold text-white">My Applications</Text>
          <Text className="text-sm text-white/50 -mt-2">Track the status of your applications.</Text>

          {appsLoading ? (
            <View className="gap-4 mt-2">
              <JobCardSkeleton />
              <JobCardSkeleton />
            </View>
          ) : userApplications.length === 0 ? (
            <View className="rounded-xl border border-dashed border-white/10 bg-[#1a1a1a] p-8 mt-2 items-center">
              <Text className="text-white/50 text-center mb-4">You haven't applied to any jobs yet.</Text>
              <Pressable
                onPress={() => router.push('/jobs')}
                className="rounded-lg px-5 py-3"
                style={{ backgroundColor: brand.accent }}>
                <Text className="font-bold" style={{ color: brand.bg }}>Browse Jobs</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-4 mt-2">
              <View className="flex-row flex-wrap gap-2 mb-2">
                <View className="flex-1 min-w-[48%] rounded-xl bg-[#1a1a1a] border border-white/10 p-3 items-center">
                  <Text className="text-xl font-bold text-white">{userApplications.length}</Text>
                  <Text className="text-[10px] uppercase text-white/50 font-bold mt-1">Total</Text>
                </View>
                <View className="flex-1 min-w-[48%] rounded-xl bg-[#1a1a1a] border border-white/10 p-3 items-center">
                  <Text className="text-xl font-bold text-[#fcc636]">
                    {userApplications.filter(a => a.status === 'applied' || a.status === 'shortlisted').length}
                  </Text>
                  <Text className="text-[10px] uppercase text-[#fcc636]/80 font-bold mt-1">In Review</Text>
                </View>
              </View>

              {userApplications.map((app) => (
                <Pressable
                  key={app.id}
                  onPress={() => router.push({ pathname: '/job/[id]', params: { id: app.job?.id || app.job_id, from: 'profile' } })}
                  className="rounded-xl border border-white/5 bg-[#1a1a1a] p-4 gap-3">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-2">
                      <Text className="text-white/70 text-sm">{app.job?.company_name || 'Unknown Company'}</Text>
                      <Text className="text-white font-bold text-lg mt-0.5">{app.job?.position_title || 'Unknown Position'}</Text>
                    </View>
                    <View className="rounded px-2 py-1 bg-white/5">
                      <Text className="text-xs font-bold text-white/70 uppercase">{app.status}</Text>
                    </View>
                  </View>
                  
                  <View className="flex-row justify-between items-center mt-1">
                    <Text className="text-xs text-white/40">Applied {timeAgo(app.created_at)}</Text>
                    {app.status === 'interview' && (
                      <Text className="text-xs font-bold text-blue-400">Interviewing</Text>
                    )}
                    {app.status === 'hired' && (
                      <Text className="text-xs font-bold text-green-400">Offer / Hired!</Text>
                    )}
                    {app.status === 'rejected' && (
                      <Text className="text-xs font-bold text-red-400">Rejected</Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Candidate upgrade removed */}

      <Pressable onPress={() => logout()} className="mt-4 items-center py-4">
        <Text className="font-bold text-red-400">Log out</Text>
      </Pressable>
    </KeyboardAwareScreen>
  );
}
