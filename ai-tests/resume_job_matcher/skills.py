"""Extract searchable skills/keywords from resume text (no LLM)."""

from __future__ import annotations

import re

# Common tech skills + role tokens for job–resume keyword prefilter.
_SKILL_TERMS: frozenset[str] = frozenset(
    {
        "python",
        "java",
        "javascript",
        "typescript",
        "rust",
        "go",
        "golang",
        "kotlin",
        "swift",
        "ruby",
        "php",
        "c++",
        "c#",
        "scala",
        "react",
        "vue",
        "angular",
        "nextjs",
        "node",
        "nodejs",
        "django",
        "flask",
        "fastapi",
        "spring",
        "rails",
        "laravel",
        "aws",
        "azure",
        "gcp",
        "kubernetes",
        "k8s",
        "docker",
        "terraform",
        "ansible",
        "linux",
        "sql",
        "postgres",
        "postgresql",
        "mysql",
        "mongodb",
        "redis",
        "elasticsearch",
        "kafka",
        "spark",
        "hadoop",
        "machine",
        "learning",
        "deep",
        "pytorch",
        "tensorflow",
        "nlp",
        "data",
        "science",
        "analytics",
        "etl",
        "tableau",
        "power",
        "bi",
        "devops",
        "ci/cd",
        "git",
        "agile",
        "scrum",
        "figma",
        "ux",
        "ui",
        "android",
        "ios",
        "mobile",
        "backend",
        "frontend",
        "fullstack",
        "full-stack",
        "engineer",
        "developer",
        "architect",
        "manager",
        "lead",
        "senior",
        "staff",
        "principal",
        "graphql",
        "rest",
        "api",
        "microservices",
        "security",
        "soc",
        "penetration",
        "blockchain",
        "solidity",
        "web3",
        "embedded",
        "firmware",
        "verilog",
        "fpga",
        "qa",
        "testing",
        "selenium",
        "cypress",
        "jest",
        "product",
        "owner",
        "pm",
        "marketing",
        "sales",
        "support",
        "hr",
        "recruiter",
        "finance",
        "accounting",
        "legal",
        "compliance",
        "healthcare",
        "fintech",
        "saas",
        "b2b",
        "remote",
        "hybrid",
    }
)

_STOPWORDS: frozenset[str] = frozenset(
    {
        "the",
        "and",
        "for",
        "with",
        "from",
        "this",
        "that",
        "have",
        "has",
        "was",
        "were",
        "are",
        "been",
        "being",
        "will",
        "your",
        "you",
        "our",
        "their",
        "about",
        "into",
        "over",
        "under",
        "such",
        "also",
        "more",
        "most",
        "other",
        "some",
        "than",
        "then",
        "them",
        "they",
        "what",
        "when",
        "where",
        "which",
        "while",
        "who",
        "whom",
        "whose",
        "why",
        "how",
        "all",
        "any",
        "each",
        "few",
        "many",
        "much",
        "own",
        "same",
        "too",
        "very",
        "can",
        "could",
        "should",
        "would",
        "may",
        "might",
        "must",
        "shall",
        "able",
        "using",
        "used",
        "use",
        "work",
        "worked",
        "working",
        "experience",
        "years",
        "year",
        "month",
        "months",
        "company",
        "team",
        "role",
        "skills",
        "skill",
        "resume",
        "curriculum",
        "vitae",
    }
)

_TOKEN_RE = re.compile(r"[a-zA-Z0-9+#./-]{2,}")


def extract_skill_terms(text: str, max_terms: int = 24) -> list[str]:
    """Return deduplicated skill-like tokens found in resume text."""
    if not text or not text.strip():
        return []

    lowered = text.lower()
    found: list[str] = []
    seen: set[str] = set()

    for token in _TOKEN_RE.findall(lowered):
        t = token.strip(".-/")
        if len(t) < 2 or t in _STOPWORDS:
            continue
        if t in _SKILL_TERMS and t not in seen:
            seen.add(t)
            found.append(t)
        if len(found) >= max_terms:
            break

    # Bigrams for phrases like "machine learning"
    if "machine" in seen and "learning" in seen and "machine learning" not in seen:
        found.append("machine learning")
        seen.add("machine learning")

    if len(found) < max_terms:
        for token in _TOKEN_RE.findall(lowered):
            t = token.strip(".-/")
            if len(t) < 3 or t in _STOPWORDS or t in seen:
                continue
            if t.isdigit():
                continue
            seen.add(t)
            found.append(t)
            if len(found) >= max_terms:
                break

    return found[:max_terms]


def build_search_query(text: str, max_terms: int = 20) -> str:
    """Build a Tantivy-friendly OR query from resume text."""
    terms = extract_skill_terms(text, max_terms=max_terms)
    if not terms:
        # Fallback: longest alphanumeric words
        words = sorted(
            {w for w in _TOKEN_RE.findall(text.lower()) if len(w) >= 4 and w not in _STOPWORDS},
            key=len,
            reverse=True,
        )[:12]
        terms = words
    if not terms:
        return ""
    # Quote multi-word terms; OR together for broad recall in stage 1.
    parts: list[str] = []
    for t in terms:
        if " " in t:
            parts.append(f'"{t}"')
        else:
            parts.append(t)
    return " OR ".join(parts)
