import hashlib
import logging
import math
import re

import httpx

from app.core.config import settings

logger = logging.getLogger("shebapath.embeddings")

_TOKEN_RE = re.compile(r"\w+", re.UNICODE)


def tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


def hash_embedding(text: str, dim: int | None = None) -> list[float]:
    """Local, deterministic bag-of-words + char-trigram embedding.

    Development / offline er jonno. Production e EMBEDDING_PROVIDER=openai use korun.
    """
    dim = dim or settings.embedding_dim
    vec = [0.0] * dim
    for tok in tokenize(text):
        feats = [tok]
        padded = f"#{tok}#"
        feats += [padded[i : i + 3] for i in range(max(len(padded) - 2, 0))]
        for f in feats:
            h = hashlib.blake2b(f.encode("utf-8"), digest_size=8).digest()
            idx = int.from_bytes(h[:4], "big") % dim
            sign = 1.0 if h[4] % 2 == 0 else -1.0
            vec[idx] += sign
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def _openai_embeddings(texts: list[str]) -> list[list[float]]:
    resp = httpx.post(
        f"{settings.embedding_base_url.rstrip('/')}/embeddings",
        headers={"Authorization": f"Bearer {settings.embedding_api_key}"},
        json={
            "model": settings.embedding_model,
            "input": texts,
            "dimensions": settings.embedding_dim,
        },
        timeout=60,
    )
    resp.raise_for_status()
    data = sorted(resp.json()["data"], key=lambda d: d["index"])
    return [d["embedding"] for d in data]


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    if settings.embedding_provider == "openai" and settings.embedding_api_key:
        out: list[list[float]] = []
        for i in range(0, len(texts), 64):
            out.extend(_openai_embeddings(texts[i : i + 64]))
        return out
    if settings.embedding_provider == "openai":
        logger.warning("EMBEDDING_API_KEY not set; falling back to local hash embeddings")
    return [hash_embedding(t) for t in texts]


def embed_query(text: str) -> list[float]:
    return embed_texts([text])[0]
