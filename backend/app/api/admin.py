from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.ai.ingest import ingest_custom_document, ingest_service, reindex_all
from app.api.deps import Pagination, log_admin, paginate, require_admin
from app.core.database import get_db
from app.models import (
    AdminActivityLog,
    Application,
    Category,
    ChatMessage,
    ChatSession,
    Role,
    SavedService,
    Service,
    ServiceDocument,
    ServiceFee,
    ServiceSource,
    ServiceStep,
    User,
)
from app.schemas import (
    AdminLogOut,
    AdminUserUpdate,
    CategoryIn,
    CategoryOut,
    KnowledgeIn,
    Page,
    ServiceDetail,
    ServiceIn,
    ServiceListItem,
    UserOut,
    VerifySourceIn,
)

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _load_service(db: Session, service_id: int) -> Service:
    service = db.scalars(
        select(Service)
        .where(Service.id == service_id)
        .options(
            selectinload(Service.documents),
            selectinload(Service.steps),
            selectinload(Service.fees),
            selectinload(Service.sources),
        )
    ).unique().first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


def _apply_payload(db: Session, service: Service, p: ServiceIn) -> None:
    for f in (
        "slug", "category_id", "title_bn", "title_en", "summary_bn", "summary_en", "eligibility_bn",
        "eligibility_en", "authority_name", "official_url", "is_popular", "is_published",
    ):
        setattr(service, f, getattr(p, f))

    numbers = [s.step_number for s in p.steps]
    if len(numbers) != len(set(numbers)):
        raise HTTPException(status_code=422, detail="Duplicate step_number")

    # Child rows ke replace kora hoy. Verified date purono source theke rakha hoy jodi URL same thake.
    old_verified = {s.url: (s.verified_at, s.verified_by_id) for s in service.sources}
    if service.id is not None:
        # Purono child row age delete + flush, nahole insert age hoye (service_id, step_number) unique e dhakka khay.
        service.documents, service.steps, service.fees, service.sources = [], [], [], []
        db.flush()
    service.documents = [
        ServiceDocument(**d.model_dump(exclude={"id"})) for d in p.documents
    ]
    service.steps = [ServiceStep(**s.model_dump(exclude={"id"})) for s in p.steps]
    service.fees = [ServiceFee(**f.model_dump(exclude={"id"})) for f in p.fees]
    new_sources = []
    for s in p.sources:
        data = s.model_dump(exclude={"id", "verified_at"})
        v_at, v_by = old_verified.get(s.url, (None, None))
        new_sources.append(ServiceSource(**data, verified_at=v_at, verified_by_id=v_by))
    service.sources = new_sources


# ---------- Services ----------
@router.get("/services", response_model=Page[ServiceListItem])
def admin_list_services(pg: Pagination = Depends(), db: Session = Depends(get_db)):
    return paginate(db, select(Service).order_by(Service.updated_at.desc()), pg, unique=True)


@router.get("/services/{service_id}", response_model=ServiceDetail)
def admin_get_service(service_id: int, db: Session = Depends(get_db)):
    return _load_service(db, service_id)


@router.post("/services", response_model=ServiceDetail, status_code=status.HTTP_201_CREATED)
def create_service(payload: ServiceIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if not db.get(Category, payload.category_id):
        raise HTTPException(status_code=422, detail="category_id does not exist")
    service = Service()
    _apply_payload(db, service, payload)
    db.add(service)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Slug already exists")
    log_admin(db, admin, "service.create", "service", service.id, {"slug": service.slug})
    db.commit()
    return _load_service(db, service.id)


@router.put("/services/{service_id}", response_model=ServiceDetail)
def update_service(
    service_id: int, payload: ServiceIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)
):
    service = _load_service(db, service_id)
    if not db.get(Category, payload.category_id):
        raise HTTPException(status_code=422, detail="category_id does not exist")
    _apply_payload(db, service, payload)
    # Content bodlale purono verification bhalid thake na: abar verify korte hobe.
    service.last_verified_at = None
    service.verified_by_id = None
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Slug already exists")
    ingest_service(db, service)  # unverified => AI knowledge base theke soriye dey
    log_admin(db, admin, "service.update", "service", service.id, {"slug": service.slug})
    db.commit()
    return _load_service(db, service.id)


@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(service_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    service = _load_service(db, service_id)
    log_admin(db, admin, "service.delete", "service", service.id, {"slug": service.slug})
    db.delete(service)
    db.commit()


# ---------- Verification ----------
@router.post("/sources/verify", response_model=ServiceDetail)
def verify_sources(payload: VerifySourceIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin manually official source check kore verify kore. Verify holei AI knowledge base e dhoke."""
    if payload.source_id is None and payload.service_id is None:
        raise HTTPException(status_code=422, detail="Provide source_id or service_id")
    now = datetime.now(timezone.utc)
    if payload.source_id is not None:
        source = db.get(ServiceSource, payload.source_id)
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")
        service_id = source.service_id
    else:
        service_id = payload.service_id
    service = _load_service(db, service_id)
    targets = [s for s in service.sources if payload.source_id in (None, s.id)]
    if not targets:
        raise HTTPException(status_code=422, detail="Service has no official sources to verify")
    for s in targets:
        s.verified_at = now
        s.verified_by_id = admin.id
    # Service tokhoni verified jokhon sob source verified
    if all(s.verified_at for s in service.sources):
        service.last_verified_at = now
        service.verified_by_id = admin.id
    db.flush()
    ingest_service(db, service)
    log_admin(db, admin, "source.verify", "service", service.id, {"source_ids": [s.id for s in targets]})
    db.commit()
    return _load_service(db, service.id)


@router.post("/knowledge", status_code=status.HTTP_201_CREATED)
def add_knowledge(payload: KnowledgeIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    doc = ingest_custom_document(db, payload.title, payload.source_url, payload.content)
    log_admin(db, admin, "knowledge.create", "knowledge_document", doc.id, {"title": doc.title})
    db.commit()
    return {"id": doc.id, "title": doc.title}


@router.post("/knowledge/reindex")
def reindex(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    count = reindex_all(db)
    log_admin(db, admin, "knowledge.reindex", details={"documents": count})
    db.commit()
    return {"indexed_services": count}


# ---------- Categories ----------
@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    cat = Category(**payload.model_dump())
    db.add(cat)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Category slug already exists")
    log_admin(db, admin, "category.create", "category", cat.id, {"slug": cat.slug})
    db.commit()
    db.refresh(cat)
    return cat


@router.put("/categories/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int, payload: CategoryIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)
):
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for k, v in payload.model_dump().items():
        setattr(cat, k, v)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Category slug already exists")
    log_admin(db, admin, "category.update", "category", cat.id)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    if db.scalar(select(func.count()).select_from(Service).where(Service.category_id == cat.id)):
        raise HTTPException(status_code=409, detail="Category has services; move or delete them first")
    log_admin(db, admin, "category.delete", "category", cat.id, {"slug": cat.slug})
    db.delete(cat)
    db.commit()


# ---------- Users ----------
@router.get("/users", response_model=Page[UserOut])
def list_users(pg: Pagination = Depends(), db: Session = Depends(get_db)):
    return paginate(db, select(User).order_by(User.id.desc()), pg, unique=True)


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int, payload: AdminUserUpdate, admin: User = Depends(require_admin), db: Session = Depends(get_db)
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot change your own role or status")
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.role is not None:
        role = db.scalar(select(Role).where(Role.name == payload.role))
        if not role:
            raise HTTPException(status_code=422, detail="Unknown role")
        user.role_id = role.id
    log_admin(db, admin, "user.update", "user", user.id, payload.model_dump(exclude_none=True))
    db.commit()
    db.refresh(user)
    return user


# ---------- Analytics & logs ----------
@router.get("/analytics")
def analytics(db: Session = Depends(get_db)):
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    def count(model, *where):
        stmt = select(func.count()).select_from(model)
        for w in where:
            stmt = stmt.where(w)
        return db.scalar(stmt) or 0

    top_saved = db.execute(
        select(Service.id, Service.title_en, Service.title_bn, func.count(SavedService.id).label("saves"))
        .join(SavedService, SavedService.service_id == Service.id)
        .group_by(Service.id)
        .order_by(func.count(SavedService.id).desc())
        .limit(5)
    ).all()
    return {
        "users": count(User),
        "new_users_7d": count(User, User.created_at >= week_ago),
        "services": count(Service),
        "published_services": count(Service, Service.is_published.is_(True)),
        "verified_services": count(Service, Service.last_verified_at.is_not(None)),
        "unverified_services": count(Service, Service.last_verified_at.is_(None)),
        "unverified_sources": count(ServiceSource, ServiceSource.verified_at.is_(None)),
        "applications": count(Application),
        "chat_sessions": count(ChatSession),
        "chat_messages": count(ChatMessage),
        "unanswered_questions": count(ChatMessage, ChatMessage.role == "assistant", ChatMessage.verified.is_(False)),
        "top_saved_services": [
            {"id": r.id, "title_en": r.title_en, "title_bn": r.title_bn, "saves": r.saves} for r in top_saved
        ],
    }


@router.get("/logs", response_model=Page[AdminLogOut])
def activity_logs(pg: Pagination = Depends(), db: Session = Depends(get_db)):
    return paginate(db, select(AdminActivityLog).order_by(AdminActivityLog.id.desc()), pg, unique=True)
