"""Shared embedding helpers for resume–job matching (MiniLM)."""

from .embeddings import (
    ModelSpec,
    cosine_sim,
    embed_texts,
    load_model_and_tokenizer,
)

__all__ = [
    "ModelSpec",
    "cosine_sim",
    "embed_texts",
    "load_model_and_tokenizer",
]
