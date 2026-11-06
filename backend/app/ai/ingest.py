"""Verified knowledge base ingestion: service -> document -> chunks -> embeddings (pgvector)."""
import hashlib
import re
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.ai.embeddings import embed_texts
from app.models import KnowledgeChunk, KnowledgeDocument, Service


def clean_text(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)  # stray HTML tags
    text = text.replace("\r", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_text(text: str, max_chars: int = 700, overlap: int = 100) -> list[str]:
    """Paragraph-aware chunking with a small character overlap."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        if len(para) > max_chars:
            # long paragraph: split by sentence/line boundaries
            parts = re.split(r"(?<=[।.!?\n])\s+", para)
        else:
            parts = [para]
        for part in parts:
            if current and len(current) + len(part) + 2 > max_chars:
                chunks.append(current)
                tail = current[-overlap:] if overlap else ""
                current = (tail + "\n" + part).strip()
            else:
                current = f"{current}\n\n{part}".strip() if current else part
    if current:
        chunks.append(current)
    # hard-split anything still too long
    final: list[str] = []
    for c in chunks:
        while len(c) > max_chars * 1.5:
            final.append(c[:max_chars])
            c = c[max_chars - overlap :]
        final.append(c)
    return final


def build_service_text(s: Service) -> str:
    """Single bilingual text block for a service (only admin-entered, verified fields)."""
    lines = [
        f"সেবা / Service: {s.title_bn} / {s.title_en}",
        f"ক্যাটাগরি / Category: {s.category.name_bn} / {s.category.name_en}",
    ]
    if s.authority_name:
        lines.append(f"দায়িত্বপ্রাপ্ত কর্তৃপক্ষ / Authority: {s.authority_name}")
    if s.official_url:
        lines.append(f"অফিসিয়াল লিংক / Official link: {s.official_url}")
    if s.summary_bn or s.summary_en:
        lines.append(f"\nসারসংক্ষেপ / Summary:\n{s.summary_bn or ''}\n{s.summary_en or ''}")
    if s.eligibility_bn or s.eligibility_en:
        lines.append(f"\nযোগ্যতা / Eligibility:\n{s.eligibility_bn or ''}\n{s.eligibility_en or ''}")
    if s.documents:
        lines.append("\nপ্রয়োজনীয় কাগজপত্র / Required documents:")
        for d in s.documents:
            req = "আবশ্যক/required" if d.is_required else "ঐচ্ছিক/optional"
            note = f" — {d.note_bn or d.note_en}" if (d.note_bn or d.note_en) else ""
            lines.append(f"- {d.name_bn} / {d.name_en} ({req}){note}")
    if s.steps:
        lines.append("\nআবেদনের ধাপ / Application steps:")
        for st in s.steps:
            desc = f": {st.description_bn or ''} {st.description_en or ''}".rstrip()
            lines.append(f"{st.step_number}. {st.title_bn} / {st.title_en}{desc if desc != ':' else ''}")
    if s.fees:
        lines.append("\nসরকারি ফি / Official fees:")
        for f in s.fees:
            amt = f"{f.amount} {f.currency}" if f.amount is not None else "অফিসিয়াল সাইটে দেখুন / see official site"
            note = f" ({f.note_bn or f.note_en})" if (f.note_bn or f.note_en) else ""
            lines.append(f"- {f.label_bn} / {f.label_en}: {amt}{note}")
    if s.sources:
        lines.append("\nসূত্র / Sources:")
        for src in s.sources:
            lines.append(f"- {src.title}: {src.url}")
    if s.last_verified_at:
        lines.append(f"\nসর্বশেষ যাচাই / Last verified: {s.last_verified_at.date().isoformat()}")
    return clean_text("\n".join(lines))


def _replace_document(db: Session, doc: KnowledgeDocument, text: str) -> None:
    chunks = chunk_text(text)
    vectors = embed_texts(chunks)
    db.execute(delete(KnowledgeChunk).where(KnowledgeChunk.document_id == doc.id))
    for i, (c, v) in enumerate(zip(chunks, vectors)):
        db.add(KnowledgeChunk(document_id=doc.id, chunk_index=i, content=c, embedding=v))


def ingest_service(db: Session, service: Service) -> KnowledgeDocument | None:
    """Re-index a service. Unverified/unpublished services are removed from the AI knowledge base."""
    doc = db.scalar(select(KnowledgeDocument).where(KnowledgeDocument.service_id == service.id))

    eligible = service.is_published and service.last_verified_at is not None
    if not eligible:
        if doc:
            doc.is_active = False
            db.flush()
        return None

    text = build_service_text(service)
    content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
    source_url = service.official_url or (service.sources[0].url if service.sources else None)

    if doc is None:
        doc = KnowledgeDocument(
            service_id=service.id,
            title=service.title_bn + " / " + service.title_en,
            source_url=source_url,
            content=text,
            content_hash=content_hash,
            verified_at=service.last_verified_at,
            is_active=True,
        )
        db.add(doc)
        db.flush()
        _replace_document(db, doc, text)
    else:
        doc.title = service.title_bn + " / " + service.title_en
        doc.source_url = source_url
        doc.verified_at = service.last_verified_at
        doc.is_active = True
        if doc.content_hash != content_hash:
            doc.content = text
            doc.content_hash = content_hash
            _replace_document(db, doc, text)
    db.flush()
    return doc


def ingest_custom_document(
    db: Session, title: str, source_url: str | None, content: str
) -> KnowledgeDocument:
    text = clean_text(content)
    doc = KnowledgeDocument(
        title=title,
        source_url=source_url,
        content=text,
        content_hash=hashlib.sha256(text.encode("utf-8")).hexdigest(),
        verified_at=datetime.now(timezone.utc),
        is_active=True,
    )
    db.add(doc)
    db.flush()
    _replace_document(db, doc, text)
    return doc


def reindex_all(db: Session) -> int:
    count = 0
    for s in db.scalars(select(Service)).unique():
        if ingest_service(db, s):
            count += 1
    return count
