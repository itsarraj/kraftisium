import { useInfiniteQuery } from '@tanstack/react-query';

import { bffApi, type JobSearchParams } from '@/services/bffApi';

const PAGE_SIZE = 12;

export function useJobsSearch(params: Pick<JobSearchParams, 'q' | 'location'>) {
  return useInfiniteQuery({
    queryKey: ['jobs', 'search', params.q ?? '', params.location ?? ''],
    queryFn: ({ pageParam }) =>
      bffApi.searchJobs({ ...params, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
  });
}
