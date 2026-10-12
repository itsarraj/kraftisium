"""Stage 1: narrow jobs via BFF Tantivy search and/or SQL before embedding rank."""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from resume_job_matcher.skills import build_search_query

log = logging.getLogger("matcher_service.prefilter")

# Row shape: (id, position_title, company_name, description, location, employment_type)
JobRow = tuple[str, str, str, str, str, str]


def _sql_recent_jobs(cur, limit: int, posted_within_days: int) -> list[JobRow]:
    cur.execute(
        """
        SELECT id::text, position_title, company_name, COALESCE(description, ''),
               COALESCE(location, ''), COALESCE(employment_type, '')
        FROM jobs
        WHERE posted_at >= NOW() - make_interval(days => %s)
        ORDER BY posted_at DESC
        LIMIT %s
        """,
        (posted_within_days, limit),
    )
    return list(cur.fetchall())


def _sql_jobs_by_ids(cur, job_ids: list[str]) -> list[JobRow]:
    if not job_ids:
        return []
    cur.execute(
        """
        SELECT id::text, position_title, company_name, COALESCE(description, ''),
               COALESCE(location, ''), COALESCE(employment_type, '')
        FROM jobs
        WHERE id = ANY(%s::uuid[])
        ORDER BY posted_at DESC
        """,
        (job_ids,),
    )
    rows = list(cur.fetchall())
    by_id = {r[0]: r for r in rows}
    return [by_id[jid] for jid in job_ids if jid in by_id]


def _bff_search_job_ids(
    bff_base: str,
    query: str,
    location: str | None,
    limit: int,
) -> list[str]:
    base = bff_base.rstrip("/")
    params: dict[str, str] = {"limit": str(limit), "page": "1"}
    if query.strip():
        params["q"] = query.strip()
    if location and location.strip():
        params["location"] = location.strip()
    url = f"{base}/api/v1/jobs/search?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        log.warning("BFF search HTTP %s: %s", e.code, e.reason)
        return []
    except Exception as e:
        log.warning("BFF search failed: %s", e)
        return []

    jobs = body.get("jobs") if isinstance(body, dict) else None
    if not isinstance(jobs, list):
        return []
    ids: list[str] = []
    for j in jobs:
        if isinstance(j, dict) and j.get("id"):
            ids.append(str(j["id"]))
    return ids


def prefilter_jobs(
    cur,
    *,
    resume_text: str,
    location: str | None = None,
    limit: int | None = None,
    posted_within_days: int | None = None,
) -> tuple[list[JobRow], dict[str, Any]]:
    """
    Hybrid stage 1: Tantivy (via BFF /jobs/search) when possible, else SQL recency + skill ILIKE.
    """
    limit = limit or int(os.environ.get("MATCHER_PREFILTER_LIMIT", "200"))
    posted_within_days = posted_within_days or int(
        os.environ.get("MATCHER_PREFILTER_DAYS", "365")
    )
    bff_url = (os.environ.get("MATCHER_BFF_URL") or "").strip()

    meta: dict[str, Any] = {
        "prefilter_limit": limit,
        "posted_within_days": posted_within_days,
        "bff_url": bff_url or None,
    }

    search_q = build_search_query(resume_text)
    meta["search_query"] = search_q or None

    job_ids: list[str] = []
    if bff_url and search_q:
        job_ids = _bff_search_job_ids(bff_url, search_q, location, limit)
        meta["bff_search_hits"] = len(job_ids)

    if job_ids:
        rows = _sql_jobs_by_ids(cur, job_ids[:limit])
        meta["source"] = "bff_tantivy"
        meta["jobs_returned"] = len(rows)
        return rows, meta

    # SQL fallback: skill OR match on title/description, then recency cap
    terms = search_q.split(" OR ") if search_q else []
    clean_terms = [t.strip('"') for t in terms if t.strip('"')][:12]

    if clean_terms:
        patterns = [f"%{t}%" for t in clean_terms]
        cur.execute(
            """
            SELECT id::text, position_title, company_name, COALESCE(description, ''),
                   COALESCE(location, ''), COALESCE(employment_type, '')
            FROM jobs
            WHERE posted_at >= NOW() - make_interval(days => %s)
              AND (
                position_title ILIKE ANY(%s)
                OR company_name ILIKE ANY(%s)
                OR COALESCE(description, '') ILIKE ANY(%s)
              )
            ORDER BY posted_at DESC
            LIMIT %s
            """,
            (posted_within_days, patterns, patterns, patterns, limit),
        )
        rows = list(cur.fetchall())
        if rows:
            meta["source"] = "sql_skills"
            meta["jobs_returned"] = len(rows)
            return rows, meta

    rows = _sql_recent_jobs(cur, limit, posted_within_days)
    meta["source"] = "sql_recent"
    meta["jobs_returned"] = len(rows)
    return rows, meta
