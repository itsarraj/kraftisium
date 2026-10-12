"""
Embedding utilities for sentence-transformers/all-MiniLM-L6-v2.

This module is consumed by:
- ai-tests/evals/run_eval.py (offline eval)
- ai-tests/matcher_service.py (refresh suggested_jobs in Postgres)

We keep the historical function names (`load_model_and_tokenizer`, `embed_texts`)
so the rest of the codebase doesn't need invasive changes.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ModelSpec:
    model_id: str = "sentence-transformers/all-MiniLM-L6-v2"


def embed_texts(model, tokenizer, texts: list[str], max_length: int = 512, device: str | None = None):
    import torch
    # SentenceTransformer handles tokenization internally; we keep tokenizer arg for API compatibility.
    # `max_length` is accepted for compatibility but not applied here (MiniLM default is fine for now).
    _ = (tokenizer, max_length)

    if device is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)

    return model.encode(
        texts,
        convert_to_tensor=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )


def cosine_sim(a, b) -> float:
    """a, b: (1, H) normalized tensors → scalar cosine similarity."""
    return float((a * b).sum(dim=1).item())


def load_model_and_tokenizer(
    base: str | None = None,
    adapter: str | None = None,
):
    from sentence_transformers import SentenceTransformer

    spec = ModelSpec()
    # Keep args for backward compatibility, but MiniLM uses a single model id.
    _ = (adapter,)
    model_id = base or spec.model_id
    model = SentenceTransformer(model_id)
    tokenizer = None
    return model, tokenizer
