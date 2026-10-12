import { useMutation, useQueryClient } from '@tanstack/react-query';

import { myApplicationsQueryKey } from '@/hooks/queries/useMyApplications';
import { savedJobsQueryKey } from '@/hooks/queries/useSavedJobs';
import { bffApi, type Job } from '@/services/bffApi';

export function useApplyToJob(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => {
      if (!userId) throw new Error('Not authenticated');
      return bffApi.applyToJob(userId, jobId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myApplicationsQueryKey(userId) });
    },
  });
}

export function useToggleSaveJob(userId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = savedJobsQueryKey(userId);

  return useMutation({
    mutationFn: ({ job, isSaved }: { job: Job; isSaved: boolean }) => {
      if (!userId) throw new Error('Not authenticated');
      return isSaved ? bffApi.unsaveJob(userId, job.id) : bffApi.saveJob(userId, job.id);
    },
    onMutate: async ({ job, isSaved }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Job[]>(queryKey) ?? [];
      const next = isSaved ? previous.filter((j) => j.id !== job.id) : [...previous, job];
      queryClient.setQueryData(queryKey, next);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
