import { Job } from '../services/bffApi';
import { JobsFilterState } from '../types/filters';

export function filterJobs(jobs: Job[], filter: JobsFilterState): Job[] {
  return jobs.filter((job) => {
    if (filter.location === 'remote' && !job.location.toLowerCase().includes('remote')) return false;
    if (filter.location === 'onsite' && job.location.toLowerCase().includes('remote')) return false;

    if (filter.salaryPeriod !== 'any' && filter.salaryPeriod !== null) {
      const period = (job.salary_period || '').toLowerCase();
      if (!period.includes(filter.salaryPeriod)) return false;
    }

    if (filter.salaryMin != null && filter.salaryMin > 0) {
      const min = job.salary_min ?? job.salary_max ?? 0;
      if (min < filter.salaryMin) return false;
    }

    if (filter.postedWithinDays != null && filter.postedWithinDays > 0) {
      const posted = new Date(job.posted_at).getTime();
      const cutoff = Date.now() - filter.postedWithinDays * 24 * 60 * 60 * 1000;
      if (posted < cutoff) return false;
    }

    if (filter.employmentType != null && filter.employmentType !== '') {
      const type = (job.employment_type || '').toLowerCase();
      const want = filter.employmentType.toLowerCase();
      if (!type.includes(want)) return false;
    }

    return true;
  });
}
