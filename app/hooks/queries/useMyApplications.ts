import { useQuery } from '@tanstack/react-query';

import { bffApi } from '@/services/bffApi';

export const myApplicationsQueryKey = (userId: string | undefined) => ['applications', 'mine', userId];

export function useMyApplications(userId: string | undefined) {
  return useQuery({
    queryKey: myApplicationsQueryKey(userId),
    queryFn: () => bffApi.getMyApplications(userId as string),
    enabled: !!userId,
  });
}
