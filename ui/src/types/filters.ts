export interface JobsFilterState {
  location: 'all' | 'remote' | 'onsite';
  salaryPeriod: 'any' | 'hourly' | 'monthly' | 'yearly';
  salaryMin: number | null;
  postedWithinDays: number | null;
  employmentType: string | null;
}

export const DEFAULT_JOBS_FILTER: JobsFilterState = {
  location: 'all',
  salaryPeriod: 'any',
  salaryMin: null,
  postedWithinDays: null,
  employmentType: null,
};
