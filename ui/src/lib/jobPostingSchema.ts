import { SITE_URL } from '../constants/site'
import { LOGO_PATH } from '../constants/brand'
import type { Job } from '../services/bffApi'

/** Statuses for which Google says a JobPosting must not be marked up (closed/unpublished listings). */
const CLOSED_STATUSES = new Set(['closed', 'filled', 'expired', 'inactive', 'draft', 'paused', 'archived'])

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  fulltime: 'FULL_TIME',
  'full-time': 'FULL_TIME',
  'full time': 'FULL_TIME',
  parttime: 'PART_TIME',
  'part-time': 'PART_TIME',
  'part time': 'PART_TIME',
  contract: 'CONTRACTOR',
  contractor: 'CONTRACTOR',
  freelance: 'CONTRACTOR',
  temporary: 'TEMPORARY',
  temp: 'TEMPORARY',
  internship: 'INTERN',
  intern: 'INTERN',
  volunteer: 'VOLUNTEER',
  'per diem': 'PER_DIEM',
  perdiem: 'PER_DIEM',
}

/** Google requires one of the fixed enum values; free-text recruiter input needs normalizing. */
function normalizeEmploymentType(raw: string): string {
  return EMPLOYMENT_TYPE_MAP[raw.trim().toLowerCase()] ?? 'OTHER'
}

const SALARY_PERIOD_MAP: Record<string, string> = {
  year: 'YEAR',
  yearly: 'YEAR',
  annual: 'YEAR',
  annually: 'YEAR',
  month: 'MONTH',
  monthly: 'MONTH',
  week: 'WEEK',
  weekly: 'WEEK',
  day: 'DAY',
  daily: 'DAY',
  hour: 'HOUR',
  hourly: 'HOUR',
}

function normalizeSalaryPeriod(raw?: string): string {
  if (!raw) return 'YEAR'
  return SALARY_PERIOD_MAP[raw.trim().toLowerCase()] ?? 'YEAR'
}

/**
 * Best-effort ISO 3166-1 alpha-2 lookup for the free-text `location` field.
 * Google requires jobLocation.address.addressCountry for non-remote postings;
 * `location` has no structured country column today, so an unresolved name
 * is omitted rather than guessed.
 */
const COUNTRY_ALIASES: Record<string, string> = {
  india: 'IN',
  usa: 'US',
  us: 'US',
  'united states': 'US',
  'united states of america': 'US',
  uk: 'GB',
  'united kingdom': 'GB',
  england: 'GB',
  canada: 'CA',
  germany: 'DE',
  france: 'FR',
  australia: 'AU',
  singapore: 'SG',
  uae: 'AE',
  'united arab emirates': 'AE',
  netherlands: 'NL',
  ireland: 'IE',
  spain: 'ES',
  italy: 'IT',
  brazil: 'BR',
  mexico: 'MX',
  japan: 'JP',
  'new zealand': 'NZ',
  poland: 'PL',
  portugal: 'PT',
  sweden: 'SE',
  switzerland: 'CH',
  pakistan: 'PK',
  bangladesh: 'BD',
  philippines: 'PH',
  indonesia: 'ID',
  nigeria: 'NG',
  'south africa': 'ZA',
}

function resolveCountryCode(location: string): string | undefined {
  const parts = location.split(',').map((p) => p.trim().toLowerCase())
  for (const part of [...parts].reverse()) {
    if (COUNTRY_ALIASES[part]) return COUNTRY_ALIASES[part]
  }
  return undefined
}

function isRemote(location: string): boolean {
  return /\bremote\b/i.test(location)
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Google expects `description` to be (safe) HTML, not a bare string. */
function descriptionHtml(description: string | undefined, fallback: string): string {
  const text = description?.trim() || fallback
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br />')}</p>`)
    .join('')
}

function absoluteUrl(pathOrUrl: string | undefined | null, fallbackPath: string): string {
  if (pathOrUrl && /^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `${SITE_URL}${pathOrUrl || fallbackPath}`
}

/**
 * Builds a schema.org JobPosting for Google Jobs rich results.
 * Returns null when the job shouldn't be marked up at all (closed/filled/draft) —
 * Google's guidelines require removing markup for postings that are no longer open.
 */
export function buildJobPostingJsonLd(job: Job): Record<string, unknown> | null {
  if (job.status && CLOSED_STATUSES.has(job.status.trim().toLowerCase())) {
    return null
  }

  const remote = isRemote(job.location)
  const countryCode = resolveCountryCode(job.location)

  return {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: job.position_title,
    description: descriptionHtml(job.description, `${job.position_title} at ${job.company_name}`),
    identifier: {
      '@type': 'PropertyValue',
      name: job.company_name,
      value: job.id,
    },
    datePosted: job.posted_at,
    validThrough: new Date(new Date(job.posted_at).getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    employmentType: normalizeEmploymentType(job.employment_type),
    directApply: true,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company_name,
      logo: absoluteUrl(job.company_logo_url, LOGO_PATH),
    },
    ...(remote
      ? { jobLocationType: 'TELECOMMUTE' }
      : {
          jobLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressLocality: job.location,
              ...(countryCode ? { addressCountry: countryCode } : {}),
            },
          },
        }),
    ...(job.salary_min || job.salary_max
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: job.salary_currency || 'USD',
            value: {
              '@type': 'QuantitativeValue',
              ...(job.salary_min ? { minValue: job.salary_min } : {}),
              ...(job.salary_max ? { maxValue: job.salary_max } : {}),
              unitText: normalizeSalaryPeriod(job.salary_period),
            },
          },
        }
      : {}),
  }
}
