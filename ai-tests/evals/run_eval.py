#!/usr/bin/env python3
"""
Offline ranking eval: recall@K, MRR on a JSON dataset (no Postgres).

Usage (from repo root or ai-tests with PYTHONPATH=.):
  python -m evals.run_eval --dataset evals/dataset_smoke.json

Dataset schema:
  { "cases": [ {
      "id": str,
      "resume_text": str,
      "k": int (default 25),
      "candidates": [ { "id": str, "text": str, "relevant": bool } ]
  } ] }
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path


def _sigmoid(x: float) -> float:
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


def recall_at_k(ranked_ids: list[str], positive_ids: set[str], k: int) -> float:
    if not positive_ids:
        return 1.0
    top = set(ranked_ids[:k])
    return len(top & positive_ids) / len(positive_ids)


def mrr(ranked_ids: list[str], positive_ids: set[str]) -> float:
    if not positive_ids:
        return 1.0
    for i, jid in enumerate(ranked_ids, start=1):
        if jid in positive_ids:
            return 1.0 / i
    return 0.0


def run_case(model, tokenizer, case: dict, device: str | None) -> dict:
    from resume_job_matcher.embeddings import embed_texts

    resume = case["resume_text"].strip()
    k = int(case.get("k", 25))
    candidates = case["candidates"]
    if not resume or not candidates:
        raise ValueError(f"case {case.get('id')}: empty resume or candidates")

    texts = [resume] + [c["text"].strip() for c in candidates]
    embs = embed_texts(model, tokenizer, texts, device=device)
    r = embs[0:1]
    job_embs = embs[1:]
    sims = (r @ job_embs.T).squeeze(0)
    scores = [_sigmoid(float(sims[i].item())) for i in range(len(candidates))]

    order = sorted(range(len(candidates)), key=lambda i: scores[i], reverse=True)
    ranked_ids = [candidates[i]["id"] for i in order]

    positive_ids = {c["id"] for c in candidates if c.get("relevant")}
    return {
        "case_id": case.get("id"),
        "recall_at_k": recall_at_k(ranked_ids, positive_ids, k),
        "mrr": mrr(ranked_ids, positive_ids),
        "k": k,
        "ranked_ids": ranked_ids,
        "top_score": scores[order[0]] if order else None,
    }


def main() -> int:
    p = argparse.ArgumentParser(description="Resume-job matcher offline eval (recall@K, MRR).")
    p.add_argument(
        "--dataset",
        type=Path,
        default=Path(__file__).resolve().parent / "dataset_smoke.json",
        help="Path to dataset JSON",
    )
    p.add_argument("--device", default=None, help='e.g. "cpu" or "cuda" (auto if omitted)')
    # Kept for backwards compatibility; MiniLM uses a single model id.
    p.add_argument("--base", default=None, help="Model id (defaults to ModelSpec.model_id)")
    p.add_argument("--adapter", default=None, help="Unused (kept for backwards compatibility)")
    args = p.parse_args()

    data = json.loads(args.dataset.read_text(encoding="utf-8"))
    cases = data.get("cases") or []
    if not cases:
        print("No cases in dataset.", file=sys.stderr)
        return 1

    from resume_job_matcher import ModelSpec, load_model_and_tokenizer

    spec = ModelSpec()
    base = args.base or getattr(spec, "model_id", None) or "sentence-transformers/all-MiniLM-L6-v2"
    model, tokenizer = load_model_and_tokenizer(base=base, adapter=args.adapter)

    results = []
    for case in cases:
        results.append(run_case(model, tokenizer, case, args.device))

    mean_recall = sum(r["recall_at_k"] for r in results) / len(results)
    mean_mrr = sum(r["mrr"] for r in results) / len(results)

    print(json.dumps({"per_case": results, "mean_recall_at_k": mean_recall, "mean_mrr": mean_mrr}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
