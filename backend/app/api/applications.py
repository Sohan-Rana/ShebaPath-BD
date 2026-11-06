"""Application tracker: user nijer haate record rakhe. Government er real-time tracking nai."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import Pagination, get_current_user, paginate
from app.core.database import get_db
from app.models import Application, Service, User
from app.schemas import ApplicationIn, ApplicationOut, ApplicationUpdate, Page

router = APIRouter(prefix="/api/applications", tags=["applications"])


def _owned(db: Session, app_id: int, user: User) -> Application:
    app = db.get(Application, app_id)
    if not app or app.user_id != user.id:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


def _check_service(db: Session, service_id: int | None) -> None:
    if service_id is not None and not db.get(Service, service_id):
        raise HTTPException(status_code=422, detail="service_id does not exist")


@router.get("", response_model=Page[ApplicationOut])
def list_applications(
    pg: Pagination = Depends(), user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    stmt = select(Application).where(Application.user_id == user.id).order_by(Application.updated_at.desc())
    return paginate(db, stmt, pg)


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(payload: ApplicationIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _check_service(db, payload.service_id)
    app = Application(user_id=user.id, **payload.model_dump())
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.put("/{app_id}", response_model=ApplicationOut)
def update_application(
    app_id: int, payload: ApplicationUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    app = _owned(db, app_id, user)
    data = payload.model_dump(exclude_unset=True)
    if "service_id" in data:
        _check_service(db, data["service_id"])
    for field, value in data.items():
        setattr(app, field, value)
    db.commit()
    db.refresh(app)
    return app


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(app_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(_owned(db, app_id, user))
    db.commit()
