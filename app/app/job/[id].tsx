import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, Text, View } from 'react-native';

import { appIdentity } from '@/constants/appIdentity';
import { brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { bffApi, type Job } from '@/services/bffApi';
import { formatSalary, timeAgo } from '@/utils/jobFormat';

export default function JobDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { user, isAuthenticated } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const canApply = isAuthenticated && user?.role === 'user';

  const loadJob = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setJob(await bffApi.getJob(String(id)));
    } catch {
      setError('Job not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJob();
  }, [id]);

  const jobId = job?.id;

  useEffect(() => {
    if (!canApply || !user?.id || !jobId) return;
    let cancelled = false;
    Promise.all([bffApi.getMyApplications(user.id), bffApi.getSavedJobs(user.id)])
      .then(([apps, savedJobs]) => {
        if (cancelled) return;
        setApplied(apps.some((a) => a.job_id === jobId));
        setSaved(savedJobs.some((j) => j.id === jobId));
      })
      .catch(() => {
        if (!cancelled) {
          setApplied(false);
          setSaved(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canApply, jobId, user?.id]);

  const handleApply = async () => {
    if (!user?.id || !job) return;
    setApplying(true);
    try {
      await bffApi.applyToJob(user.id, job.id);
      setApplied(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to apply.';
      if (msg.toLowerCase().includes('resume')) {
        Alert.alert('Resume required', msg, [
          { text: 'Upload resume', onPress: () => router.push('/profile') },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setApplying(false);
    }
  };

  const handleToggleSave = async () => {
    if (!user?.id || !job || saving) return;
    const next = !saved;
    setSaving(true);
    setSaved(next);
    try {
      if (next) await bffApi.saveJob(user.id, job.id);
      else await bffApi.unsaveJob(user.id, job.id);
    } catch {
      setSaved(!next);
      Alert.alert('Error', 'Failed to update saved jobs.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = () => {
    if (!job) return;
    const url = `${appIdentity.webUrl}/jobs/${job.id}`;
    void Share.share({
      message: `${job.position_title} at ${job.company_name} — ${url}`,
      url,
      title: job.position_title,
    });
  };

  const backLabel =
    from === 'matches' ? 'Back to AI Matches' : from === 'jobs' ? 'Back to Jobs' : 'Back';

  const goBack = () => {
    if (from === 'matches') router.replace('/(tabs)/matches');
    else if (from === 'jobs') router.replace('/(tabs)/jobs');
    else router.back();
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-bg">
        <ActivityIndicator color={brand.accent} size="large" />
      </View>
    );
  }

  if (error || !job) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-brand-bg px-6">
        <Text className="text-lg text-white/70">{error || 'Job not found'}</Text>
        <View className="mt-3 flex-row gap-3">
          <Pressable onPress={loadJob} className="rounded-xl border border-white/10 px-6 py-3">
            <Text className="font-bold text-white">Try again</Text>
          </Pressable>
          <Pressable onPress={goBack} className="rounded-xl px-6 py-3 bg-brand-accent">
            <Text className="font-bold text-brand-bg">{backLabel}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isNew = Date.now() - new Date(job.posted_at).getTime() < 24 * 60 * 60 * 1000;
  const matchPct = job.match_score != null ? Math.round(job.match_score) : null;

  return (
    <ScrollView className="flex-1 bg-brand-bg px-4 py-6">
      <Stack.Screen options={{ title: job.position_title }} />

      <View className="mb-4 flex-row items-center justify-between">
        <Pressable onPress={goBack} className="flex-row items-center gap-2">
          <Text className="text-brand-accent">← {backLabel}</Text>
        </Pressable>
        <View className="flex-row items-center gap-3">
          {canApply && (
            <Pressable
              onPress={handleToggleSave}
              disabled={saving}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full bg-black/30">
              <Text style={{ color: saved ? brand.accent : 'rgba(255,255,255,0.6)', fontSize: 18 }}>
                {saved ? '★' : '☆'}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleShare}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full bg-black/30">
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>⤴</Text>
          </Pressable>
        </View>
      </View>

      <View className="rounded-xl border border-white/10 bg-brand-surface p-5">
        <View className="flex-row gap-4">
          <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-brand-bg">
            {job.company_logo_url ? (
              <Image source={{ uri: job.company_logo_url }} className="h-full w-full" contentFit="cover" />
            ) : (
              <Text className="text-3xl font-bold text-brand-accent">{job.company_name.charAt(0)}</Text>
            )}
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-base text-white/70">{job.company_name}</Text>
            <View className="mt-1 flex-row flex-wrap items-center gap-2">
              <Text className="text-2xl font-bold text-white">{job.position_title}</Text>
              {job.featured && (
                <View className="rounded bg-brand-accent/20 px-1.5 py-0.5">
                  <Text className="text-xs font-medium text-brand-accent">Featured</Text>
                </View>
              )}
              {isNew && (
                <View className="rounded bg-brand-accent/10 px-1.5 py-0.5">
                  <Text className="text-xs font-medium text-brand-accent">New post</Text>
                </View>
              )}
            </View>
            {matchPct != null && matchPct > 0 && (
              <View
                className={`mt-2 self-start rounded-full border px-3 py-1 ${
                  matchPct > 80 ? 'border-brand-accent/50 bg-brand-accent/10' : 'border-white/10 bg-white/5'
                }`}>
                <Text className={`text-xs font-bold ${matchPct > 80 ? 'text-brand-accent' : 'text-white/70'}`}>
                  {matchPct}% AI Match{matchPct > 80 ? ' 🔥' : ''}
                </Text>
              </View>
            )}
            <Text className="mt-2 text-sm text-white/50">{job.location}</Text>
            <Text className="text-sm text-white/50">{timeAgo(job.posted_at)}</Text>
            <Text className="mt-1 text-sm text-white/50">
              {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
            </Text>
            <View className="mt-2 self-start rounded-full bg-brand-accent/10 px-3 py-1">
              <Text className="text-xs font-semibold text-brand-accent">{job.employment_type}</Text>
            </View>
          </View>
        </View>

        {canApply ? (
          <Pressable
            onPress={handleApply}
            disabled={applied || applying}
            className="mt-6 items-center rounded-xl py-4"
            style={{
              backgroundColor: brand.accent,
              opacity: applied || applying ? 0.6 : 1,
            }}>
            <Text className="font-bold text-brand-bg">
              {applied ? 'Applied' : applying ? 'Applying…' : 'Apply now'}
            </Text>
          </Pressable>
        ) : !isAuthenticated ? (
          <Pressable
            onPress={() => router.push('/login')}
            className="mt-6 items-center rounded-xl py-4 border border-brand-accent/50">
            <Text className="font-bold text-brand-accent">Sign in to apply</Text>
          </Pressable>
        ) : null}

        <View className="my-6 h-px bg-white/10" />
        <Text className="text-lg font-bold text-white">Job description</Text>
        <Text className="mt-2 text-sm leading-6 text-white/80">{job.description || 'No description available.'}</Text>
      </View>
    </ScrollView>
  );
}
