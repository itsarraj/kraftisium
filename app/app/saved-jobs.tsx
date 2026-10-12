import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { JobCard } from '@/components/JobCard';
import JobCardSkeleton from '@/components/JobCardSkeleton';
import { brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { bffApi, type Job } from '@/services/bffApi';

export default function SavedJobsScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [saved, apps] = await Promise.all([
        bffApi.getSavedJobs(user.id),
        bffApi.getMyApplications(user.id),
      ]);
      setSavedJobs(saved);
      setAppliedJobIds(new Set(apps.map((a) => a.job_id)));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#2b2b2b] px-4 pt-12">
        <JobCardSkeleton />
      </View>
    );
  }
  if (!isAuthenticated || !user) {
    return <Redirect href="/login" />;
  }

  const handleApply = async (jobId: string) => {
    if (!user.id) return;
    setApplyingId(jobId);
    try {
      await bffApi.applyToJob(user.id, jobId);
      setAppliedJobIds((prev) => new Set([...prev, jobId]));
    } finally {
      setApplyingId(null);
    }
  };

  const handleUnsave = async (jobId: string) => {
    if (!user.id) return;
    await bffApi.unsaveJob(user.id, jobId);
    setSavedJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  return (
    <View className="flex-1 bg-[#2b2b2b]">
      <View className="border-b border-white/10 px-4 py-3">
        <Text className="text-xl font-bold text-white">Saved jobs</Text>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
          <JobCardSkeleton />
          <JobCardSkeleton />
        </View>
      ) : savedJobs.length === 0 ? (
        <View className="mx-4 mt-8 rounded-xl border border-white/10 bg-[#1a1a1a] p-6">
          <Text className="text-center text-white/70">No saved jobs yet.</Text>
          <Pressable
            onPress={() => router.push('/(tabs)/jobs')}
            className="mt-4 items-center rounded-xl py-3"
            style={{ backgroundColor: brand.accent }}>
            <Text className="font-bold" style={{ color: brand.bg }}>
              Browse jobs
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
          {savedJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onPress={() => router.push({ pathname: '/job/[id]', params: { id: job.id, from: 'saved-jobs' } })}
              onApply={handleApply}
              applied={appliedJobIds.has(job.id)}
              applying={applyingId === job.id}
              saved={true}
              onToggleSave={handleUnsave}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
