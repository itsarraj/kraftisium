#!/usr/bin/env python3
"""Pull remote tech job listings from SerpApi's Google Jobs engine and emit a
Postgres seed file matching the `jobs` table schema (bff/migrations).

Usage:
    export SERPAPI_KEY=...
    python3 scripts/fetch_remote_tech_jobs_serpapi.py

Outputs:
    bff/seeds/seed_remote_tech_jobs_serpapi.sql   -- idempotent INSERT ... ON CONFLICT seed
    scripts/.remote_tech_jobs_raw.json            -- raw normalized SerpApi results (audit trail)

Apply the seed:
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f bff/seeds/seed_remote_tech_jobs_serpapi.sql
"""
import datetime
import json
import os
import re
import sys
import time

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

API_KEY = os.environ.get("SERPAPI_KEY")
if not API_KEY:
    sys.exit("SERPAPI_KEY is not set in the environment.")

BASE_URL = "https://serpapi.com/search.json"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL_PATH = os.path.join(ROOT, "bff", "seeds", "seed_remote_tech_jobs_serpapi.sql")
RAW_JSON_PATH = os.path.join(ROOT, "scripts", ".remote_tech_jobs_raw.json")

ROLES = [
    "software engineer",
    "backend engineer",
    "frontend engineer",
    "full stack developer",
    "devops engineer",
    "site reliability engineer",
    "cloud engineer",
    "data engineer",
    "data scientist",
    "data analyst",
    "machine learning engineer",
    "ai engineer",
    "mobile developer",
    "ios developer",
    "android developer",
    "qa engineer",
    "security engineer",
    "product manager",
    "engineering manager",
    "platform engineer",
]

MAX_PAGES_PER_ROLE = 6
MAX_TOTAL_SEARCHES = 180  # safety margin under the requested 250-search cap
MIN_NEW_PER_PAGE = 2  # stop paginating a role once new unique results dry up

_session = requests.Session()
_retry = Retry(total=4, backoff_factor=1.5, status_forcelist=[429, 500, 502, 503, 504], allowed_methods=["GET"])
_session.mount("https://", HTTPAdapter(max_retries=_retry))

EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contractor", "Internship", "Temporary"]

_REL_TIME_RE = re.compile(r"^(\d+)\s+(hour|hours|day|days|week|weeks|month|months)\s+ago$", re.I)
_SALARY_RE = re.compile(
    r"^([\d,]+(?:\.\d+)?)(K)?\s*[–\-]\s*([\d,]+(?:\.\d+)?)(K)?\s+a\s+(year|hour|month)$", re.I
)

search_count = 0
seen_job_ids = set()
collected = []  # list of (role, job_dict)


def fetch_page(query, next_token=None):
    global search_count
    params = {
        "engine": "google_jobs",
        "q": query,
        "hl": "en",
        "gl": "us",
        "google_domain": "google.com",
        "api_key": API_KEY,
    }
    if next_token:
        params["next_page_token"] = next_token

    for attempt in range(3):
        try:
            resp = _session.get(BASE_URL, params=params, timeout=30)
            search_count += 1
            data = resp.json()
            break
        except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
            print(f"  ! transient error on {query!r} (attempt {attempt + 1}/3): {e}", file=sys.stderr)
            time.sleep(2 * (attempt + 1))
    else:
        print(f"  ! giving up on {query!r} for this page after 3 attempts", file=sys.stderr)
        return [], None

    if data.get("error"):
        print(f"  ! {query}: {data['error']}", file=sys.stderr)
        return [], None
    pagination = data.get("serpapi_pagination") or {}
    return data.get("jobs_results", []), pagination.get("next_page_token")


def is_confirmed_remote(job):
    loc = (job.get("location") or "").lower()
    exts = [e.lower() for e in job.get("extensions", [])]
    return "anywhere" in loc or "remote" in loc or any("work from home" in e for e in exts)


def parse_employment_type(extensions):
    for ext in extensions or []:
        if ext.strip() in EMPLOYMENT_TYPES:
            return ext.strip()
    return "Full-time"


def parse_salary(extensions):
    """Returns (min, max) annualized USD, or (None, None) if no salary extension found."""
    for ext in extensions or []:
        m = _SALARY_RE.match(ext.strip())
        if not m:
            continue
        lo = float(m.group(1).replace(",", ""))
        hi = float(m.group(3).replace(",", ""))
        if m.group(2):
            lo *= 1000
        if m.group(4):
            hi *= 1000
        period = m.group(5).lower()
        if period == "hour":
            lo *= 2080  # standard full-time hours/year, for comparability with annual listings
            hi *= 2080
        elif period == "month":
            lo *= 12
            hi *= 12
        return int(round(lo)), int(round(hi))
    return None, None


def parse_posted_at(extensions):
    now = datetime.datetime.now(datetime.timezone.utc)
    for ext in extensions or []:
        stripped = ext.strip()
        m = _REL_TIME_RE.match(stripped)
        if m:
            n = int(m.group(1))
            unit = m.group(2).lower()
            if unit.startswith("hour"):
                delta = datetime.timedelta(hours=n)
            elif unit.startswith("day"):
                delta = datetime.timedelta(days=n)
            elif unit.startswith("week"):
                delta = datetime.timedelta(weeks=n)
            else:
                delta = datetime.timedelta(days=n * 30)
            return now - delta
        if stripped.lower() in ("just posted", "today"):
            return now
    return now


def best_url(job):
    if job.get("source_link"):
        return job["source_link"]
    opts = job.get("apply_options") or []
    if opts and opts[0].get("link"):
        return opts[0]["link"]
    return job.get("share_link") or ""


def best_description(job):
    desc = job.get("description")
    if desc:
        return desc
    parts = []
    for h in job.get("job_highlights", []) or []:
        title = h.get("title", "")
        items = "; ".join(h.get("items", []))
        parts.append(f"{title}: {items}" if title else items)
    return "\n".join(parts)


def run():
    global search_count
    try:
        for role in ROLES:
            if search_count >= MAX_TOTAL_SEARCHES:
                print(f"Reached global search budget ({MAX_TOTAL_SEARCHES}), stopping role sweep.")
                break
            query = f"remote {role}"
            token = None
            print(f"== {role} ==", flush=True)
            for page in range(MAX_PAGES_PER_ROLE):
                if search_count >= MAX_TOTAL_SEARCHES:
                    break
                jobs, token = fetch_page(query, token)
                new_count = 0
                for j in jobs:
                    jid = j.get("job_id")
                    if not jid or jid in seen_job_ids:
                        continue
                    if not is_confirmed_remote(j):
                        continue
                    seen_job_ids.add(jid)
                    collected.append((role, j))
                    new_count += 1
                print(f"  page {page + 1}: +{new_count} new (total {len(collected)}), searches used: {search_count}", flush=True)
                if not token or new_count < MIN_NEW_PER_PAGE:
                    break
                time.sleep(0.3)
            # persist after every role so a later crash never loses earlier work
            write_outputs()
    finally:
        write_outputs()
        print(f"\nTotal unique remote tech jobs collected: {len(collected)}")
        print(f"Total SerpApi searches used: {search_count}")


def write_outputs():
    os.makedirs(os.path.dirname(RAW_JSON_PATH), exist_ok=True)
    with open(RAW_JSON_PATH, "w") as f:
        json.dump(
            [{"role": role, **job} for role, job in collected],
            f,
            indent=2,
        )
    write_sql_seed()


def sql_str(s):
    if s is None or s == "":
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"


def sql_array(items):
    if not items:
        return "NULL"
    return "ARRAY[" + ",".join(sql_str(i) for i in items) + "]::TEXT[]"


def write_sql_seed():
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with open(SQL_PATH, "w") as f:
        f.write("-- Auto-generated remote tech jobs seed, pulled live from SerpApi's Google Jobs engine.\n")
        f.write(f"-- Generated: {now}Z -- {len(collected)} jobs, {search_count} SerpApi searches used.\n")
        f.write("-- Regenerate: SERPAPI_KEY=... python3 scripts/fetch_remote_tech_jobs_serpapi.py\n")
        f.write('-- Apply:      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f bff/seeds/seed_remote_tech_jobs_serpapi.sql\n\n')
        f.write("BEGIN;\n\n")

        for role, j in collected:
            title = j.get("title") or "Untitled Position"
            company = j.get("company_name") or "Unknown Company"
            raw_location = j.get("location") or "Remote"
            # Google's own convention for fully-remote listings is the literal
            # string "Anywhere" -- not what end users expect to read, so normalize
            # it to "Remote" while leaving genuinely region-scoped locations as-is.
            location = "Remote" if raw_location.strip().lower() == "anywhere" else raw_location
            exts = j.get("extensions") or []
            employment_type = parse_employment_type(exts)
            salary_min, salary_max = parse_salary(exts)
            posted_at = parse_posted_at(exts)
            description = best_description(j)
            url = best_url(j)
            thumb = j.get("thumbnail")
            job_id = j.get("job_id")
            tags = [role.title(), "Remote"]

            f.write("INSERT INTO jobs (\n")
            f.write("    company_name, company_logo_url, position_title, location, employment_type,\n")
            f.write("    salary_min, salary_max, salary_currency, salary_period, description,\n")
            f.write("    status, posted_at, external_id, source, url, is_remote, tags\n")
            f.write(") VALUES (\n")
            f.write(f"    {sql_str(company)}, {sql_str(thumb)}, {sql_str(title)}, {sql_str(location)}, {sql_str(employment_type)},\n")
            f.write(f"    {salary_min if salary_min is not None else 'NULL'}, {salary_max if salary_max is not None else 'NULL'}, 'USD', 'Yearly', {sql_str(description)},\n")
            f.write(f"    'active', {sql_str(posted_at.isoformat())}, {sql_str(job_id)}, 'google_jobs', {sql_str(url)}, TRUE, {sql_array(tags)}\n")
            f.write(")\n")
            f.write("ON CONFLICT (external_id, source) DO UPDATE SET\n")
            f.write("    company_name = EXCLUDED.company_name, company_logo_url = EXCLUDED.company_logo_url,\n")
            f.write("    position_title = EXCLUDED.position_title, location = EXCLUDED.location,\n")
            f.write("    employment_type = EXCLUDED.employment_type, salary_min = EXCLUDED.salary_min,\n")
            f.write("    salary_max = EXCLUDED.salary_max, description = EXCLUDED.description,\n")
            f.write("    url = EXCLUDED.url, tags = EXCLUDED.tags, updated_at = CURRENT_TIMESTAMP;\n\n")

        f.write("COMMIT;\n")


if __name__ == "__main__":
    run()
