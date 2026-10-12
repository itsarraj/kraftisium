import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterModal } from '@/components/FilterModal';
import { JobCard } from '@/components/JobCard';
import JobCardSkeleton from '@/components/JobCardSkeleton';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import { brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { bffApi, type Job } from '@/services/bffApi';
import { DEFAULT_JOBS_FILTER, type JobsFilterState } from '@/types/filters';
import { filterJobs } from '@/utils/filterJobs';
import { isUserPremium } from '@/types/subscription';

export default function AIMatchesTabScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [suggested, setSuggested] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [jobsFilter, setJobsFilter] = useState<JobsFilterState>(DEFAULT_JOBS_FILTER);

  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollTop(offsetY > 500);
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const loadMatches = useCallback(async () => {
    if (!isAuthenticated || !user || user.role !== 'user') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [jobs, apps] = await Promise.all([
        bffApi.getSuggestedJobs(user.id),
        bffApi.getMyApplications(user.id),
      ]);
      setSuggested(jobs);
      setAppliedJobIds(new Set(apps.map((a) => a.job_id)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const handleRefreshMatches = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      await bffApi.refreshSuggestedJobs(user.id);
      await new Promise((r) => setTimeout(r, 2500));
      await loadMatches();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => filterJobs(suggested, jobsFilter), [suggested, jobsFilter]);
  const isPremium = isUserPremium(user?.subscription);
  const freeLimit = user?.subscription?.free_ai_matches_limit ?? 3;
  const displayed = isPremium ? filtered : filtered.slice(0, freeLimit);
  const hiddenCount = isPremium ? 0 : Math.max(0, filtered.length - freeLimit);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#2b2b2b] px-4 pt-12">
        <JobCardSkeleton />
        <JobCardSkeleton />
        <JobCardSkeleton />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center bg-[#2b2b2b] px-6">
        <Text className="text-center text-lg text-white/80">Sign in to see AI job matches.</Text>
        <Pressable
          onPress={() => router.push('/login')}
          className="mt-6 rounded-xl px-8 py-4"
          style={{ backgroundColor: brand.accent }}>
          <Text className="font-bold" style={{ color: brand.bg }}>
            Log in
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }
  if (user.role !== 'user') {
    return <Redirect href="/unauthorized" />;
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

  return (
    <View className="flex-1 bg-[#2b2b2b]">
      <View className="flex-row items-center justify-between border-b border-white/10 px-4 py-3">
        <Text className="text-xl font-bold text-white">✨ AI Matches</Text>
        <View className="flex-row gap-2">
          <Pressable
            onPress={handleRefreshMatches}
            disabled={refreshing}
            className="rounded-lg border px-3 py-2"
            style={{ borderColor: brand.accent, opacity: refreshing ? 0.5 : 1 }}>
            <Text style={{ color: brand.accent }}>{refreshing ? '…' : 'Refresh'}</Text>
          </Pressable>
          <Pressable onPress={() => setFilterOpen(true)} className="rounded-lg border border-white/10 px-3 py-2">
            <Text className="text-white">Filters</Text>
          </Pressable>
        </View>
      </View>
      <FilterModal visible={filterOpen} onClose={() => setFilterOpen(false)} filter={jobsFilter} onChange={setJobsFilter} />

      {loading && suggested.length === 0 ? (
        <View style={{ padding: 16 }}>
          <JobCardSkeleton />
          <JobCardSkeleton />
          <JobCardSkeleton />
        </View>
      ) : displayed.length === 0 ? (
        <View className="mx-4 mt-8 rounded-xl border border-white/10 bg-[#1a1a1a] p-6">
          <Text className="text-center text-white/70">No AI matches yet.</Text>
          <Text className="mt-2 text-center text-sm text-white/50">
            Upload your resume in Profile, then tap Refresh. Matches use keyword prefilter + embeddings (no LLM).
          </Text>
          <Pressable
            onPress={() => router.push('/profile')}
            className="mt-4 items-center rounded-xl py-3"
            style={{ backgroundColor: brand.accent }}>
            <Text className="font-bold" style={{ color: brand.bg }}>
              Go to profile
            </Text>
          </Pressable>
          <Pressable
            onPress={handleRefreshMatches}
            disabled={refreshing}
            className="mt-3 items-center rounded-xl border py-3"
            style={{ borderColor: brand.accent }}>
            <Text className="font-bold" style={{ color: brand.accent }}>
              {refreshing ? 'Refreshing…' : 'Refresh matches'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
        <ScrollView 
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
          {!isPremium && filtered.length > 0 ? (
            <View className="rounded-xl border p-4 mb-2" style={{ borderColor: `${brand.accent}4D`, backgroundColor: brand.surface }}>
              <Text className="font-bold text-white">
                Showing {displayed.length} of {filtered.length} matches
              </Text>
              <Text className="mt-1 text-sm text-white/50">
                Free plan: {freeLimit} matches. Premium ${user?.subscription?.yearly_price_usd ?? 199}/yr for unlimited.
              </Text>
              <Pressable
                onPress={() => router.push('/upgrade')}
                className="mt-3 items-center rounded-xl py-3"
                style={{ backgroundColor: brand.accent }}>
                <Text className="font-bold" style={{ color: brand.bg }}>
                  Upgrade
                </Text>
              </Pressable>
            </View>
          ) : null}
          {hiddenCount > 0 ? (
            <Text className="text-center text-sm text-white/40 mb-2">
              {hiddenCount} more match{hiddenCount === 1 ? '' : 'es'} with Premium
            </Text>
          ) : null}
          {displayed.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onPress={() =>
                router.push({ pathname: '/job/[id]', params: { id: job.id, from: 'matches' } })
              }
              onApply={handleApply}
              applied={appliedJobIds.has(job.id)}
              applying={applyingId === job.id}
            />
          ))}
        </ScrollView>
        <ScrollToTopButton visible={showScrollTop} onPress={scrollToTop} />
        </>
      )}
    </View>
  );
}
