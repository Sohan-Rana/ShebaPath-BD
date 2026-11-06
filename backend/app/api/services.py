from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import Pagination, paginate
from app.core.database import get_db
from app.models import Category, Service
from app.schemas import CategoryOut, Page, ServiceDetail, ServiceListItem

router = APIRouter(prefix="/api", tags=["services"])


def _public_services():
    return select(Service).where(Service.is_published.is_(True))


def _search_filter(q: str):
    like = f"%{q.strip()}%"
    return or_(
        Service.title_bn.ilike(like),
        Service.title_en.ilike(like),
        Service.summary_bn.ilike(like),
        Service.summary_en.ilike(like),
        Service.slug.ilike(like),
        Service.authority_name.ilike(like),
    )


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return list(db.scalars(select(Category).order_by(Category.sort_order, Category.id)))


@router.get("/services", response_model=Page[ServiceListItem])
def list_services(
    category: str | None = Query(None, description="category slug"),
    q: str | None = Query(None, max_length=100),
    popular: bool | None = None,
    pg: Pagination = Depends(),
    db: Session = Depends(get_db),
):
    stmt = _public_services().order_by(Service.is_popular.desc(), Service.title_en)
    if category:
        stmt = stmt.join(Category, Category.id == Service.category_id).where(Category.slug == category)
    if q:
        stmt = stmt.where(_search_filter(q))
    if popular is not None:
        stmt = stmt.where(Service.is_popular.is_(popular))
    return paginate(db, stmt, pg, unique=True)


# NB: /search must be declared before /services/{id}
@router.get("/services/search", response_model=Page[ServiceListItem])
def search_services(
    q: str = Query(..., min_length=1, max_length=100),
    pg: Pagination = Depends(),
    db: Session = Depends(get_db),
):
    stmt = _public_services().where(_search_filter(q)).order_by(Service.is_popular.desc(), Service.title_en)
    return paginate(db, stmt, pg, unique=True)


@router.get("/services/{id_or_slug}", response_model=ServiceDetail)
def get_service(id_or_slug: str, db: Session = Depends(get_db)):
    stmt = (
        _public_services()
        .options(
            selectinload(Service.documents),
            selectinload(Service.steps),
            selectinload(Service.fees),
            selectinload(Service.sources),
        )
    )
    stmt = stmt.where(Service.id == int(id_or_slug)) if id_or_slug.isdigit() else stmt.where(Service.slug == id_or_slug)
    service = db.scalars(stmt).unique().first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service
