import os

# Test database ke import-er AGE set korte hobe (settings import e read hoy)
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://shebapath:shebapath@localhost:5432/shebapath_test"
)
os.environ["ANTHROPIC_API_KEY"] = ""
os.environ["EMBEDDING_PROVIDER"] = "hash"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.core.ratelimit import reset_rate_limits  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Category, Role, User  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    reset_rate_limits()
    with SessionLocal() as db:
        user_role = Role(name="user")
        admin_role = Role(name="admin")
        db.add_all([user_role, admin_role])
        db.flush()
        db.add(
            User(
                email="admin@test.bd",
                password_hash=hash_password("AdminPass123"),
                full_name="Test Admin",
                role_id=admin_role.id,
            )
        )
        db.add(Category(slug="travel", name_bn="ভ্রমণ", name_en="Travel", sort_order=1))
        db.commit()
    yield


@pytest.fixture
def client():
    return TestClient(app)


def _token(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def admin_headers(client):
    return {"Authorization": f"Bearer {_token(client, 'admin@test.bd', 'AdminPass123')}"}


@pytest.fixture
def user_headers(client):
    r = client.post(
        "/api/auth/register",
        json={"email": "citizen@test.bd", "password": "CitizenPass123", "full_name": "Test Citizen"},
    )
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def service_payload():
    return {
        "slug": "test-passport",
        "category_id": 1,
        "title_bn": "পাসপোর্ট আবেদন",
        "title_en": "Passport Application",
        "summary_en": "How to apply for a passport.",
        "authority_name": "Dept of Immigration & Passports",
        "official_url": "https://www.epassport.gov.bd",
        "is_popular": True,
        "documents": [{"name_bn": "জাতীয় পরিচয়পত্র", "name_en": "National ID"}],
        "steps": [{"step_number": 1, "title_bn": "আবেদন", "title_en": "Apply online"}],
        "fees": [{"label_bn": "ফি", "label_en": "Fee", "amount": "4025.00"}],
        "sources": [{"title": "ePassport portal", "url": "https://www.epassport.gov.bd"}],
    }
