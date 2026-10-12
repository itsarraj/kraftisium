import { APPLICATION_STATUSES } from '../../services/bffApi';

export const STATUS_META: Record<
  (typeof APPLICATION_STATUSES)[number],
  { label: string; badge: string; border: string }
> = {
  applied: {
    label: 'Applied',
    badge: 'bg-white/10 text-white/70',
    border: 'border-white/20',
  },
  shortlisted: {
    label: 'Shortlisted',
    badge: 'bg-[#fcc636]/15 text-[#fcc636]',
    border: 'border-[#fcc636]/40',
  },
  interview: {
    label: 'Interview',
    badge: 'bg-blue-500/15 text-blue-300',
    border: 'border-blue-400/40',
  },
  rejected: {
    label: 'Rejected',
    badge: 'bg-red-500/15 text-red-400',
    border: 'border-red-500/30',
  },
  hired: {
    label: 'Hired',
    badge: 'bg-green-500/15 text-green-400',
    border: 'border-green-400/40',
  },
};

export function statusLabel(status: string): string {
  if (status in STATUS_META) {
    return STATUS_META[status as keyof typeof STATUS_META].label;
  }
  return status;
}

export function countByStatus<T extends { status: string }>(
  items: T[],
  status: string
): number {
  return items.filter((a) => a.status === status).length;
}
