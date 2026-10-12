import { useEffect, useMemo, useState } from 'react'
import { Job } from '../services/bffApi'

const STORAGE_PREFIX = 'kraftisium_match_digest_'
const DAILY_BATCH_SIZE = 8

interface StoredDigest {
  date: string
  shownIds: string[]
}

interface DailyMatchDigest {
  /** This session's batch — the only matches rendered as the primary, scrollable list. */
  todaysMatches: Job[]
  /** Everything else: matches already surfaced on an earlier day, tucked behind a collapsed section. */
  reviewedMatches: Job[]
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function readDigest(userId: string): StoredDigest | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.date === 'string' && Array.isArray(parsed?.shownIds)) return parsed
    return null
  } catch {
    return null
  }
}

function writeDigest(userId: string, digest: StoredDigest): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(digest))
  } catch {
    /* ignore quota errors */
  }
}

/**
 * Splits ranked matches into a capped "today" batch and everything already
 * shown on a previous day, so the AI Matches page has a natural stopping
 * point instead of behaving like an endless feed.
 */
export function useDailyMatchDigest(userId: string | undefined, matches: Job[]): DailyMatchDigest {
  const [storedDigest, setStoredDigest] = useState<StoredDigest | null>(() => (userId ? readDigest(userId) : null))

  useEffect(() => {
    setStoredDigest(userId ? readDigest(userId) : null)
  }, [userId])

  const result = useMemo(() => {
    if (!userId || matches.length === 0) {
      return { todaysMatches: [] as Job[], reviewedMatches: [] as Job[], isNewDay: true }
    }
    const today = todayKey()
    if (storedDigest && storedDigest.date === today) {
      const shownIdSet = new Set(storedDigest.shownIds)
      return {
        todaysMatches: matches.filter((m) => shownIdSet.has(m.id)),
        reviewedMatches: matches.filter((m) => !shownIdSet.has(m.id)),
        isNewDay: false,
      }
    }
    return {
      todaysMatches: matches.slice(0, DAILY_BATCH_SIZE),
      reviewedMatches: matches.slice(DAILY_BATCH_SIZE),
      isNewDay: true,
    }
  }, [userId, matches, storedDigest])

  useEffect(() => {
    if (userId && result.isNewDay && result.todaysMatches.length > 0) {
      const digest = { date: todayKey(), shownIds: result.todaysMatches.map((m) => m.id) }
      writeDigest(userId, digest)
      setStoredDigest(digest)
    }
  }, [userId, result.isNewDay, result.todaysMatches])

  return { todaysMatches: result.todaysMatches, reviewedMatches: result.reviewedMatches }
}
