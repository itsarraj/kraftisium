export function timeAgo(date: string): string {
  const now = new Date();
  const posted = new Date(date);
  const diffInMs = now.getTime() - posted.getTime();
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays > 0) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  if (diffInHours > 0) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  return `${diffInMins} min${diffInMins > 1 ? 's' : ''} ago`;
}

export function formatSalary(min?: number, max?: number, currency?: string): string {
  if (!min && !max) return 'Salary not disclosed';
  const curr = currency || 'USD';
  if (min && max) return `${(min / 1000).toFixed(0)}-${(max / 1000).toFixed(0)}k ${curr}`;
  if (min) return `>${(min / 1000).toFixed(0)}k ${curr}`;
  return `<${(max! / 1000).toFixed(0)}k ${curr}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-IN');
}
