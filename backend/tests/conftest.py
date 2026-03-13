"""
conftest.py — pytest fixtures for MyWorkspace API tests.

IMPORTANT: environment variables MUST be set before any app imports so that
pydantic-settings and SQLAlchemy pick up the test values instead of .env file.
"""
import os

# ── Override env vars before ANY app import ────────────────────────
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_workspace.db")
os.environ.setdefault("SECRET_KEY",   "test-secret-key-for-testing-only-32charrrs!")
os.environ.setdefault("ALGORITHM",    "HS256")
os.environ.setdefault("GEMINI_API_KEY",        "fake-gemini-key")
os.environ.setdefault("STRIPE_SECRET_KEY",     "sk_test_fake_key")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_fake")
os.environ.setdefault("STRIPE_PUBLISHABLE_KEY","pk_test_fake_key")
os.environ.setdefault("SMTP_HOST",     "localhost")
os.environ.setdefault("SMTP_PORT",     "25")
os.environ.setdefault("SMTP_USER",     "")
os.environ.setdefault("SMTP_PASSWORD", "")
os.environ.setdefault("FROM_EMAIL",    "test@example.com")
os.environ.setdefault("ADMIN_EMAIL",   "admin@example.com")
os.environ.setdefault("APP_URL",       "http://localhost:3000")
os.environ.setdefault("BACKEND_URL",   "http://localhost:8000")
os.environ.setdefault("UPLOAD_DIR",    "/tmp/test_uploads")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:3000")

import pytest
from unittest.mock import patch, MagicMock, AsyncMock

# ── Patch heavy external services before importing the app ─────────
# genai.configure() is called at module level in rag_service — patch it early.
_genai_patcher      = patch("google.generativeai.configure")
_calendar_patcher   = patch("app.services.calendar_service.get_calendar_service", return_value=None)
_genai_patcher.start()
_calendar_patcher.start()

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Now safe to import app components
from app.core.database import Base, get_db  # noqa: E402
from main import app                        # noqa: E402

# ── In-memory SQLite engine for tests ─────────────────────────────
TEST_DB_URL = "sqlite:///./test_workspace.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# ── Session-scoped fixtures ────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """Create all tables once per test session; drop them afterwards."""
    os.makedirs("/tmp/test_uploads", exist_ok=True)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_workspace.db"):
        os.remove("./test_workspace.db")


@pytest.fixture(scope="session")
def client(setup_db):
    """Return a TestClient that is reused across the whole session."""
    return TestClient(app, raise_server_exceptions=True)


@pytest.fixture(scope="session")
def guest_token(client):
    """Register + login a guest user; return the JWT token."""
    client.post("/api/auth/register", json={
        "full_name": "Test Guest",
        "email": "guest@test.com",
        "password": "GuestPass1!",
    })
    res = client.post("/api/auth/login",
                      data={"username": "guest@test.com", "password": "GuestPass1!"})
    return res.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token(client, setup_db):
    """
    Create an admin user directly in the DB (bypassing registration role lock)
    and return its JWT.
    """
    from app.core.security import get_password_hash, create_access_token
    from app.models.user import User, UserRole

    db = TestingSession()
    try:
        existing = db.query(User).filter(User.email == "admin@test.com").first()
        if not existing:
            admin = User(
                full_name="Test Admin",
                email="admin@test.com",
                hashed_password=get_password_hash("AdminPass1!"),
                role=UserRole.admin,
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            user_id = admin.id
        else:
            user_id = existing.id
    finally:
        db.close()

    return create_access_token({"sub": str(user_id)})


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def guest_headers(guest_token):
    return {"Authorization": f"Bearer {guest_token}"}


@pytest.fixture
def db_session():
    """Provide a direct DB session for tests that need to manipulate the DB state."""
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()
