import { LegendList, type LegendListRef } from '@legendapp/list/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import JobCardSkeleton from '@/components/JobCardSkeleton';
import ScrollToTopButton from '@/components/ScrollToTopButton';

import { FilterModal } from '@/components/FilterModal';
import { JobCard } from '@/components/JobCard';
import { brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { useApplyToJob, useToggleSaveJob } from '@/hooks/mutations/useJobActions';
import { useJobsSearch } from '@/hooks/queries/useJobsSearch';
import { useMyApplications } from '@/hooks/queries/useMyApplications';
import { useSavedJobs } from '@/hooks/queries/useSavedJobs';
import type { Job } from '@/services/bffApi';
import { DEFAULT_JOBS_FILTER, type JobsFilterState } from '@/types/filters';
import { filterJobs } from '@/utils/filterJobs';

export default function JobsTabScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{ q?: string; location?: string }>();
  const initialQ = typeof params.q === 'string' ? params.q : '';
  const initialLocation = typeof params.location === 'string' ? params.location : '';
  const [filter, setFilter] = useState<JobsFilterState>(DEFAULT_JOBS_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchText, setSearchText] = useState(initialQ);
  const [locationText, setLocationText] = useState(initialLocation);

  const listRef = useRef<LegendListRef>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const isUser = isAuthenticated && user?.role === 'user';

  const {
    data,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useJobsSearch({ q: searchText, location: locationText });

  const { data: applications } = useMyApplications(isUser ? user?.id : undefined);
  const { data: savedJobs } = useSavedJobs(isUser ? user?.id : undefined);
  const applyMutation = useApplyToJob(user?.id);
  const toggleSaveMutation = useToggleSaveJob(user?.id);

  const jobs = useMemo(() => data?.pages.flatMap((page) => page.jobs) ?? [], [data]);
  const serverTotal = data?.pages[0]?.total_count ?? 0;
  const appliedJobIds = useMemo(
    () => new Set((applications ?? []).map((a) => a.job_id)),
    [applications]
  );
  const savedJobIds = useMemo(() => new Set((savedJobs ?? []).map((j) => j.id)), [savedJobs]);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollTop(offsetY > 500);
  };

  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  useEffect(() => {
    if (typeof params.q === 'string') setSearchText(params.q);
    if (typeof params.location === 'string') setLocationText(params.location);
  }, [params.q, params.location]);

  const handleToggleSave = useCallback(
    (job: Job) => {
      if (!user?.id) return;
      toggleSaveMutation.mutate({ job, isSaved: savedJobIds.has(job.id) });
    },
    [user?.id, savedJobIds, toggleSaveMutation]
  );

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const filteredJobs = useMemo(() => filterJobs(jobs, filter), [jobs, filter]);
  const listExtra = useMemo(
    () => ({
      applied: [...appliedJobIds].sort().join(','),
      saved: [...savedJobIds].sort().join(','),
      applying: applyMutation.isPending ? applyMutation.variables ?? null : null,
    }),
    [appliedJobIds, savedJobIds, applyMutation.isPending, applyMutation.variables]
  );

  const handleApply = useCallback(
    (jobId: string) => {
      if (!user?.id) return;
      applyMutation.mutate(jobId);
    },
    [user?.id, applyMutation]
  );

  return (
    <View className="flex-1 bg-[#2b2b2b]">
      <View className="border-b border-white/10 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold text-white">
            {serverTotal > 0 ? serverTotal.toLocaleString('en-IN') : filteredJobs.length} jobs
          </Text>
          <Pressable onPress={() => setFilterOpen(true)} className="rounded-lg border border-white/10 px-4 py-2">
            <Text className="font-medium text-white">Filters</Text>
          </Pressable>
        </View>

        <View className="mt-3 flex-row gap-2">
          <View className="flex-1 rounded-xl border border-white/10 px-3 py-2" style={{ backgroundColor: brand.surface }}>
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Job title, company, skills..."
              placeholderTextColor="rgba(255,255,255,0.35)"
              className="text-white"
              autoCapitalize="none"
              returnKeyType="search"
            />
          </View>
          <View className="w-36 rounded-xl border border-white/10 px-3 py-2" style={{ backgroundColor: brand.surface }}>
            <TextInput
              value={locationText}
              onChangeText={setLocationText}
              placeholder="Location"
              placeholderTextColor="rgba(255,255,255,0.35)"
              className="text-white"
              autoCapitalize="words"
              returnKeyType="search"
            />
          </View>
        </View>
      </View>

      <FilterModal visible={filterOpen} onClose={() => setFilterOpen(false)} filter={filter} onChange={setFilter} />

      {isPending && jobs.length === 0 ? (
        <View style={{ padding: 16 }}>
          <JobCardSkeleton />
          <JobCardSkeleton />
          <JobCardSkeleton />
        </View>
      ) : (
        <>
          <LegendList
            ref={listRef}
            data={filteredJobs}
            keyExtractor={(item) => item.id}
            recycleItems
            estimatedItemSize={168}
            extraData={listExtra}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item: job }) => (
              <JobCard
                job={job}
                onPress={() => router.push({ pathname: '/job/[id]', params: { id: job.id, from: 'jobs' } })}
                onApply={isUser ? handleApply : undefined}
                applied={appliedJobIds.has(job.id)}
                applying={applyMutation.isPending && applyMutation.variables === job.id}
                saved={savedJobIds.has(job.id)}
                onToggleSave={isUser ? () => handleToggleSave(job) : undefined}
              />
            )}
            ListEmptyComponent={
              <Text className="text-center text-white/50 py-8">No jobs match these filters.</Text>
            }
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={{ marginTop: 16 }}>
                  <JobCardSkeleton />
                  <JobCardSkeleton />
                </View>
              ) : null
            }
          />
        <ScrollToTopButton visible={showScrollTop} onPress={scrollToTop} />
        </>
      )}
    </View>
  );
}
