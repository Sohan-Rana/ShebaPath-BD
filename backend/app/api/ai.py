import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.ai.rag import answer_question, detect_language
from app.api.deps import get_current_user, get_optional_user
from app.core.config import settings
from app.core.database import get_db
from app.core.ratelimit import rate_limit
from app.models import ChatMessage, ChatSession, User
from app.schemas import ChatIn, ChatMessageOut, ChatOut, ChatSessionDetail, ChatSessionOut

router = APIRouter(prefix="/api/ai", tags=["ai"])

FOLLOW_UPS = {
    "bn": ["প্রয়োজনীয় কাগজপত্র কী কী?", "সরকারি ফি কত?", "আবেদনের ধাপগুলো বলুন"],
    "en": ["What documents are required?", "What is the official fee?", "Explain the application steps"],
}


def _can_access(session: ChatSession, user: User | None) -> bool:
    if session.user_id is None:
        return True  # anonymous session: unguessable UUID
    return user is not None and session.user_id == user.id


@router.post("/chat", response_model=ChatOut, dependencies=[Depends(rate_limit("ai", settings.ai_rate_limit_per_minute))])
def chat(payload: ChatIn, user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    lang = detect_language(payload.message)
    if payload.session_id:
        session = db.get(ChatSession, payload.session_id)
        if not session or not _can_access(session, user):
            raise HTTPException(status_code=404, detail="Chat session not found")
    else:
        session = ChatSession(
            id=uuid.uuid4(),
            user_id=user.id if user else None,
            title=payload.message[:60],
            language=lang,
        )
        db.add(session)
        db.flush()

    history = [{"role": m.role, "content": m.content} for m in session.messages]
    db.add(ChatMessage(session_id=session.id, role="user", content=payload.message))

    answer, sources, verified = answer_question(db, payload.message, history, lang)
    reply = ChatMessage(session_id=session.id, role="assistant", content=answer, sources=sources, verified=verified)
    db.add(reply)
    db.commit()
    db.refresh(reply)
    return ChatOut(
        session_id=session.id,
        message=ChatMessageOut.model_validate(reply),
        suggestions=FOLLOW_UPS[lang] if verified else [],
    )


@router.get("/sessions", response_model=list[ChatSessionOut])
def list_sessions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(ChatSession).where(ChatSession.user_id == user.id).order_by(ChatSession.updated_at.desc()).limit(50)
    return list(db.scalars(stmt))


@router.get("/sessions/{session_id}", response_model=ChatSessionDetail)
def get_session(session_id: uuid.UUID, user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    session = db.scalars(
        select(ChatSession).where(ChatSession.id == session_id).options(selectinload(ChatSession.messages))
    ).first()
    if not session or not _can_access(session, user):
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session
