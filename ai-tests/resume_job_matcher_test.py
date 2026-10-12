#!/usr/bin/env python3
"""
CLI test for Resume-Job Matcher embeddings (MiniLM).

Shared logic lives in package resume_job_matcher.
"""

from __future__ import annotations

import argparse

from resume_job_matcher import ModelSpec, cosine_sim, embed_texts, load_model_and_tokenizer


def read_text_arg(value: str) -> str:
    if value.startswith("@"):
        path = value[1:]
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    return value


def main() -> int:
    p = argparse.ArgumentParser(description="Test Resume-Job Matcher similarity.")
    p.add_argument(
        "--resume",
        required=False,
        default="Software engineer with Python experience",
        help='Resume text, or "@file.txt"',
    )
    p.add_argument(
        "--job",
        required=False,
        default="Looking for Python developer",
        help='Job description text, or "@file.txt"',
    )
    p.add_argument("--max-length", type=int, default=512)
    p.add_argument("--device", default=None, help='e.g. "cpu" or "cuda" (auto if omitted)')
    p.add_argument("--adapter", default=None, help="Unused (kept for backwards compatibility)")
    p.add_argument("--base", default=ModelSpec.model_id, help="Model id")
    args = p.parse_args()

    resume_text = read_text_arg(args.resume).strip()
    job_text = read_text_arg(args.job).strip()

    if not resume_text or not job_text:
        raise SystemExit("Both resume and job text must be non-empty.")

    model, tokenizer = load_model_and_tokenizer(base=args.base, adapter=args.adapter)

    resume_emb = embed_texts(model, tokenizer, [resume_text], max_length=args.max_length, device=args.device)
    job_emb = embed_texts(model, tokenizer, [job_text], max_length=args.max_length, device=args.device)

    sim = cosine_sim(resume_emb, job_emb)
    # Scores used in the HTTP matcher are `sigmoid(dot_product)`; for CLI we only need similarity.

    print("\n=== Result ===")
    print(f"cosine_similarity: {sim:.6f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
