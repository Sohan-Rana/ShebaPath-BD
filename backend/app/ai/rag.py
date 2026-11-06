"""Source-grounded RAG: retrieve verified chunks -> LLM -> answer with sources. Refuses to guess."""
import logging
import re
from dataclasses import dataclass
from datetime import datetime

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.embeddings import embed_query, tokenize
from app.core.config import settings
from app.models import KnowledgeChunk, KnowledgeDocument, Service

logger = logging.getLogger("shebapath.rag")

SYSTEM_PROMPT = """You are ShebaPath AI, a citizen service information assistant for Bangladesh.

Answer in the language used by the user.

Use only retrieved, verified information for factual government service claims.

Never invent application fees, legal requirements, deadlines, eligibility criteria or official procedures.

Clearly distinguish official information from general guidance.

Always provide relevant official source links when available.

If information is missing or outdated, explain the limitation and direct the user to the relevant official authority.

Never claim that you can access government application databases unless an authorized integration exists."""

_BN_RE = re.compile(r"[ঀ-৿]")
_STOP = {
    "the", "and", "for", "how", "what", "can", "does", "need", "get", "are", "with", "from",
    "কি", "কী", "কোন", "কিভাবে", "জন্য", "এবং", "করতে", "হয়", "আমি", "আমার", "এর", "কত",
}

REFUSAL = {
    "bn": (
        "দুঃখিত, এই বিষয়ে আমার কাছে যাচাইকৃত অফিসিয়াল তথ্য নেই, তাই আমি অনুমান করে উত্তর দিচ্ছি না। "
        "সঠিক ও হালনাগাদ তথ্যের জন্য অনুগ্রহ করে সংশ্লিষ্ট সরকারি কর্তৃপক্ষের অফিসিয়াল ওয়েবসাইট বা "
        "জাতীয় তথ্য বাতায়ন (https://bangladesh.gov.bd) দেখুন, অথবা আমাকে অন্য কোনো সেবা সম্পর্কে জিজ্ঞাসা করুন।"
    ),
    "en": (
        "Sorry, I don't have verified official information on this, so I won't guess. "
        "Please check the relevant government authority's official website or the National Portal "
        "(https://bangladesh.gov.bd) for accurate, up-to-date details, or ask me about another service."
    ),
}


def detect_language(text: str) -> str:
    return "bn" if _BN_RE.search(text) else "en"


@dataclass
class Retrieved:
    content: str
    title: str
    url: str | None
    verified_at: datetime | None
    service_slug: str | None
    distance: float


def retrieve(db: Session, query: str, k: int | None = None) -> list[Retrieved]:
    k = k or settings.rag_top_k
    qvec = embed_query(query)
    dist = KnowledgeChunk.embedding.cosine_distance(qvec).label("distance")
    rows = db.execute(
        select(KnowledgeChunk, KnowledgeDocument, dist)
        .join(KnowledgeDocument, KnowledgeDocument.id == KnowledgeChunk.document_id)
        .where(KnowledgeDocument.is_active.is_(True))
        .order_by(dist)
        .limit(k * 2)
    ).all()

    q_tokens = {t for t in tokenize(query) if len(t) >= 3 and t not in _STOP}
    slugs = {
        sid: slug
        for sid, slug in db.execute(
            select(Service.id, Service.slug).where(
                Service.id.in_([d.service_id for _, d, _ in rows if d.service_id])
            )
        )
    }
    results: list[Retrieved] = []
    for chunk, doc, distance in rows:
        overlap = len(q_tokens & set(tokenize(chunk.content)))
        # accept if semantically close OR shares at least two meaningful words with the question
        if distance <= settings.rag_max_distance or overlap >= 2:
            results.append(
                Retrieved(
                    content=chunk.content,
                    title=doc.title,
                    url=doc.source_url,
                    verified_at=doc.verified_at,
                    service_slug=slugs.get(doc.service_id),
                    distance=float(distance),
                )
            )
    return results[:k]


def _build_context(chunks: list[Retrieved]) -> str:
    parts = []
    for i, c in enumerate(chunks, 1):
        verified = c.verified_at.date().isoformat() if c.verified_at else "unknown"
        parts.append(f"[S{i}] {c.title} | source: {c.url or 'n/a'} | verified: {verified}\n{c.content}")
    return "\n\n---\n\n".join(parts)


def _call_llm(question: str, context: str, history: list[dict], lang: str) -> str:
    user_block = (
        f"Verified context (the ONLY source for factual claims):\n\n{context}\n\n"
        f"Question ({'Bangla' if lang == 'bn' else 'English'}): {question}\n\n"
        "Answer using only the verified context. Cite sources as [S1], [S2]. "
        "If the context does not fully answer, say what is missing and point to the official authority."
    )
    messages = [*history[-6:], {"role": "user", "content": user_block}]
    resp = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": settings.anthropic_api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": settings.llm_model,
            "max_tokens": 1024,
            "system": SYSTEM_PROMPT,
            "messages": messages,
        },
        timeout=60,
    )
    resp.raise_for_status()
    return "".join(b.get("text", "") for b in resp.json().get("content", []) if b.get("type") == "text")


def _extractive_answer(chunks: list[Retrieved], lang: str) -> str:
    """LLM key nai: sudhu verified text-i dekhai (kono nijer kotha na)."""
    head = (
        "যাচাইকৃত অফিসিয়াল তথ্য অনুযায়ী (AI সারসংক্ষেপ বন্ধ আছে, তাই সরাসরি উদ্ধৃত):"
        if lang == "bn"
        else "From verified official information (AI summarisation is off, so this is quoted directly):"
    )
    body = "\n\n".join(f"[S{i}] {c.content}" for i, c in enumerate(chunks[:2], 1))
    return f"{head}\n\n{body}"


def answer_question(
    db: Session, question: str, history: list[dict], lang: str | None = None
) -> tuple[str, list[dict], bool]:
    """Returns (answer, sources, verified). verified=False when no reliable info was found."""
    lang = lang or detect_language(question)
    # follow-up support: include last user turn in retrieval query
    prev_user = next((m["content"] for m in reversed(history) if m["role"] == "user"), "")
    retrieval_query = f"{prev_user}\n{question}" if prev_user and len(question) < 40 else question

    chunks = retrieve(db, retrieval_query)
    if not chunks:
        return REFUSAL[lang], [], False

    sources: list[dict] = []
    seen = set()
    for c in chunks:
        key = (c.title, c.url)
        if key in seen:
            continue
        seen.add(key)
        sources.append(
            {
                "title": c.title,
                "url": c.url,
                "verified_at": c.verified_at.isoformat() if c.verified_at else None,
                "service_slug": c.service_slug,
            }
        )

    if settings.anthropic_api_key:
        try:
            answer = _call_llm(question, _build_context(chunks), history, lang)
        except Exception:  # network / API error: fall back to quoting verified text
            logger.exception("LLM call failed; using extractive fallback")
            answer = _extractive_answer(chunks, lang)
    else:
        answer = _extractive_answer(chunks, lang)
    return answer, sources, True
