from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import SavedService, Service, User
from app.schemas import SavedServiceIn, SavedServiceOut, UserOut, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def read_me(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserOut)
def update_me(payload: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.get("/saved-services", response_model=list[SavedServiceOut])
def list_saved(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(SavedService).where(SavedService.user_id == user.id).order_by(SavedService.id.desc())
    return list(db.scalars(stmt).unique())


@router.post("/saved-services", response_model=SavedServiceOut, status_code=status.HTTP_201_CREATED)
def save_service(payload: SavedServiceIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = db.get(Service, payload.service_id)
    if not service or not service.is_published:
        raise HTTPException(status_code=404, detail="Service not found")
    existing = db.scalar(
        select(SavedService).where(
            SavedService.user_id == user.id, SavedService.service_id == payload.service_id
        )
    )
    if existing:
        return existing
    saved = SavedService(user_id=user.id, service_id=payload.service_id)
    db.add(saved)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Already saved")
    db.refresh(saved)
    return saved


@router.delete("/saved-services/{saved_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_saved(saved_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    saved = db.get(SavedService, saved_id)
    if not saved or saved.user_id != user.id:
        raise HTTPException(status_code=404, detail="Saved service not found")
    db.delete(saved)
    db.commit()
