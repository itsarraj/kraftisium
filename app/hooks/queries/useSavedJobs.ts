import { useQuery } from '@tanstack/react-query';

import { bffApi } from '@/services/bffApi';

export const savedJobsQueryKey = (userId: string | undefined) => ['saved-jobs', userId];

export function useSavedJobs(userId: string | undefined) {
  return useQuery({
    queryKey: savedJobsQueryKey(userId),
    queryFn: () => bffApi.getSavedJobs(userId as string),
    enabled: !!userId,
  });
}
