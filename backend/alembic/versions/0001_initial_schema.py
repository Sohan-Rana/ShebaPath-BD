"""initial schema: all tables + pgvector

Revision ID: 0001
Revises:
Create Date: 2026-11-05
"""
from alembic import op

from app.core.database import Base
import app.models  # noqa: F401

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    # Initial migration: models theke sob table (indexes, FK, unique constraints shoho).
    # Porer schema change gulo `alembic revision --autogenerate -m "..."` diye korun.
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
