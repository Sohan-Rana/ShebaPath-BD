import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator

T = TypeVar("T")


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


# ---------- Auth / users ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=150)
    phone: str | None = Field(default=None, max_length=30)
    preferred_language: str = Field(default="bn", pattern="^(bn|en)$")


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(ORM):
    id: int
    email: str
    full_name: str
    phone: str | None
    preferred_language: str
    is_active: bool
    role_name: str
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    phone: str | None = Field(default=None, max_length=30)
    preferred_language: str | None = Field(default=None, pattern="^(bn|en)$")


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class AdminUserUpdate(BaseModel):
    is_active: bool | None = None
    role: str | None = Field(default=None, pattern="^(user|admin)$")


# ---------- Catalogue ----------
class CategoryOut(ORM):
    id: int
    slug: str
    name_bn: str
    name_en: str
    description_bn: str | None
    description_en: str | None
    icon: str | None
    sort_order: int


class CategoryIn(BaseModel):
    slug: str = Field(pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=100)
    name_bn: str = Field(min_length=1, max_length=150)
    name_en: str = Field(min_length=1, max_length=150)
    description_bn: str | None = None
    description_en: str | None = None
    icon: str | None = Field(default=None, max_length=50)
    sort_order: int = 0


class DocumentIO(ORM):
    id: int | None = None
    name_bn: str
    name_en: str
    note_bn: str | None = None
    note_en: str | None = None
    is_required: bool = True
    sort_order: int = 0


class StepIO(ORM):
    id: int | None = None
    step_number: int = Field(ge=1)
    title_bn: str
    title_en: str
    description_bn: str | None = None
    description_en: str | None = None


class FeeIO(ORM):
    id: int | None = None
    label_bn: str
    label_en: str
    amount: Decimal | None = Field(default=None, ge=0)
    currency: str = "BDT"
    note_bn: str | None = None
    note_en: str | None = None


class SourceIO(ORM):
    id: int | None = None
    title: str
    url: str
    authority: str | None = None
    is_official: bool = True
    verified_at: datetime | None = None


class ServiceListItem(ORM):
    id: int
    slug: str
    title_bn: str
    title_en: str
    summary_bn: str | None
    summary_en: str | None
    is_popular: bool
    last_verified_at: datetime | None
    category: CategoryOut


class ServiceDetail(ServiceListItem):
    eligibility_bn: str | None
    eligibility_en: str | None
    authority_name: str | None
    official_url: str | None
    is_published: bool
    documents: list[DocumentIO]
    steps: list[StepIO]
    fees: list[FeeIO]
    sources: list[SourceIO]


class ServiceIn(BaseModel):
    slug: str = Field(pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=150)
    category_id: int
    title_bn: str = Field(min_length=1, max_length=255)
    title_en: str = Field(min_length=1, max_length=255)
    summary_bn: str | None = None
    summary_en: str | None = None
    eligibility_bn: str | None = None
    eligibility_en: str | None = None
    authority_name: str | None = None
    official_url: str | None = Field(default=None, max_length=500)
    is_popular: bool = False
    is_published: bool = True
    documents: list[DocumentIO] = []
    steps: list[StepIO] = []
    fees: list[FeeIO] = []
    sources: list[SourceIO] = []

    @field_validator("official_url")
    @classmethod
    def _url_ok(cls, v):
        if v and not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v

    @field_validator("sources")
    @classmethod
    def _source_urls(cls, v):
        for s in v:
            if not s.url.startswith(("http://", "https://")):
                raise ValueError("Source URL must start with http:// or https://")
        return v


class VerifySourceIn(BaseModel):
    source_id: int | None = None
    service_id: int | None = None


# ---------- Saved services / applications ----------
class SavedServiceIn(BaseModel):
    service_id: int


class SavedServiceOut(ORM):
    id: int
    service_id: int
    created_at: datetime
    service: ServiceListItem


class ApplicationIn(BaseModel):
    service_id: int | None = None
    service_name: str = Field(min_length=1, max_length=255)
    reference_number: str | None = Field(default=None, max_length=100)
    submitted_on: date | None = None
    expected_completion: date | None = None
    status: str = Field(default="submitted", max_length=50)
    notes: str | None = None
    reminder_at: datetime | None = None


class ApplicationUpdate(BaseModel):
    service_id: int | None = None
    service_name: str | None = Field(default=None, min_length=1, max_length=255)
    reference_number: str | None = Field(default=None, max_length=100)
    submitted_on: date | None = None
    expected_completion: date | None = None
    status: str | None = Field(default=None, max_length=50)
    notes: str | None = None
    reminder_at: datetime | None = None


class ApplicationOut(ORM):
    id: int
    service_id: int | None
    service_name: str
    reference_number: str | None
    submitted_on: date | None
    expected_completion: date | None
    status: str
    notes: str | None
    reminder_at: datetime | None
    created_at: datetime
    updated_at: datetime


# ---------- AI ----------
class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: uuid.UUID | None = None


class SourceRef(BaseModel):
    title: str
    url: str | None = None
    verified_at: datetime | None = None
    service_slug: str | None = None


class ChatMessageOut(ORM):
    id: int
    role: str
    content: str
    sources: list[SourceRef] | None = None
    verified: bool | None = None
    created_at: datetime


class ChatOut(BaseModel):
    session_id: uuid.UUID
    message: ChatMessageOut
    suggestions: list[str] = []


class ChatSessionOut(ORM):
    id: uuid.UUID
    title: str
    language: str
    created_at: datetime
    updated_at: datetime


class ChatSessionDetail(ChatSessionOut):
    messages: list[ChatMessageOut]


class KnowledgeIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    source_url: str | None = Field(default=None, max_length=500)
    content: str = Field(min_length=20)


# ---------- Admin ----------
class AdminLogOut(ORM):
    id: int
    admin_id: int | None
    action: str
    entity_type: str | None
    entity_id: str | None
    details: dict | None
    created_at: datetime
