"""
main.py — FastAPI application entry point
==========================================
Responsibilities:
  - Create all database tables on startup (SQLAlchemy create_all)
  - Run lightweight schema migrations for columns added after initial deploy
  - Seed default admin/superuser accounts if they don't yet exist
  - Mount the /uploads folder as a public static file server
  - Register all API routes under the /api prefix
  - Configure CORS so the frontend origin is allowed
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.database import Base, engine
from app.core.config import settings
from app.api.routes import router
import app.models.user  # importing this module registers all ORM models with SQLAlchemy

# ── Create tables ──────────────────────────────────────────────────
# create_all is safe to call on every boot — it only creates tables
# that don't already exist; it never drops or modifies existing ones.
Base.metadata.create_all(bind=engine)

# ── Ensure upload sub-directories exist ───────────────────────────
# Each content type stores its files in its own sub-folder under UPLOAD_DIR.
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
for folder in [
    "projects",        # project screenshots / notebooks
    "tutorials",       # blog post cover images
    "product_images",  # shop product thumbnails
    "products",        # shop digital files (PDFs, ZIPs)
    "freebies",        # free download files
    "freebie_images",  # freebie cover images
    "about",           # profile photo and CV
    "settings",        # chatbot photo and site logos
    "hero_slides",     # homepage hero slider images
    "project_sourcecode",
    "certifications",
    "education",
    "clients",
]:
    os.makedirs(f"{settings.UPLOAD_DIR}/{folder}", exist_ok=True)

# ── FastAPI app instance ───────────────────────────────────────────
app = FastAPI(
    title="MyWorkSpace API",
    description="Backend API for Tunji Ologun's WorkSpace Portfolio",
    version="2.0.0",
)

# ── CORS middleware ────────────────────────────────────────────────
# Allowed origins are read from ALLOWED_ORIGINS env var (comma-separated).
# Example: ALLOWED_ORIGINS=https://myapp.railway.app,http://localhost:3000
_allowed_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# ── Static file serving ────────────────────────────────────────────
# Files saved to UPLOAD_DIR are publicly accessible at /uploads/<path>.
# e.g.  /uploads/hero_slides/s1.png
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ── API routes ─────────────────────────────────────────────────────
# All routes defined in app/api/routes.py are mounted under /api.
# e.g.  GET /api/projects  →  routes.get_projects()
app.include_router(router, prefix="/api")


# ── Health-check endpoints ─────────────────────────────────────────
@app.get("/")
def root():
    """Root ping — used by Docker health-check and load balancers."""
    return {"status": "ok", "message": "MyWorkSpace API running"}


@app.get("/health")
def health():
    """Lightweight health endpoint — returns 200 if server is running."""
    return {"status": "healthy"}


# ══════════════════════════════════════════════════════════════════
# STARTUP EVENTS
# These run once each time the server boots, in declaration order.
# ══════════════════════════════════════════════════════════════════

@app.on_event("startup")
def run_migrations():
    """
    Safe column-level migrations that run on every boot.

    SQLAlchemy's create_all() only creates new tables — it never adds
    columns to existing tables. Columns added to models after the initial
    deployment must be added here via raw SQL with IF NOT EXISTS so they
    are safe to run repeatedly.
    """
    from app.core.database import SessionLocal
    from sqlalchemy import text
    db = SessionLocal()
    try:
        # Added when hero slide management was built — allows each slide
        # to link to an external/internal URL and carry a subtitle line.
        db.execute(text("ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS link_url VARCHAR(500)"))
        db.execute(text("ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS subtitle VARCHAR(300)"))
        db.commit()
    except Exception as e:
        print(f"Migration note: {e}")
    finally:
        db.close()


@app.on_event("startup")
def seed_users():
    """
    Seed default admin accounts on first boot.

    Creates a superuser and an admin account if they don't already exist.
    These are the initial credentials — CHANGE BOTH PASSWORDS after
    the first login via the Users section in the admin dashboard.

    Roles:
      superuser — full access, can promote/demote any user including admins
      admin     — can manage all content but cannot change user roles above admin
    """
    from app.core.database import SessionLocal
    from app.models.user import User, UserRole
    from app.core.security import get_password_hash

    db = SessionLocal()
    try:
        # ── Seed SUPERUSER ─────────────────────────────────────────
        if not db.query(User).filter(User.email == "superuser@workspace.com").first():
            db.add(User(
                full_name="Tunji Ologun (Superuser)",
                email="superuser@workspace.com",
                hashed_password=get_password_hash("Super@123"),
                role=UserRole.superuser,
                is_active=True,
            ))
            db.commit()
            print("👑 Superuser created: superuser@workspace.com / Super@123")

        # ── Seed ADMIN ─────────────────────────────────────────────
        if not db.query(User).filter(User.email == "admin@workspace.com").first():
            db.add(User(
                full_name="Tunji Ologun",
                email="admin@workspace.com",
                hashed_password=get_password_hash("Admin@123"),
                role=UserRole.admin,
                is_active=True,
            ))
            db.commit()
            print("✅ Admin created: admin@workspace.com / Admin@123")

    except Exception as e:
        print(f"⚠️  Seed warning: {e}")
    finally:
        db.close()
