from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.database import Base, engine
from app.core.config import settings
from app.api.routes import router
import app.models.user  # registers all ORM models

# Create all database tables on startup
Base.metadata.create_all(bind=engine)

# Ensure upload directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
for folder in ["projects", "tutorials", "product_images", "products",
               "freebies", "freebie_images", "about", "settings",
               "hero_slides", "project_sourcecode", "certifications", "education", "clients"]:
    os.makedirs(f"{settings.UPLOAD_DIR}/{folder}", exist_ok=True)

app = FastAPI(
    title="MyWorkSpace API",
    description="Backend API for Tunji Ologun's WorkSpace Portfolio",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://animated-xylophone-pjxq6gpwp6pcrxg4-3000.app.github.dev"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {"status": "ok", "message": "MyWorkSpace API running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.on_event("startup")
def seed_users():
    from app.core.database import SessionLocal
    from app.models.user import User, UserRole
    from app.core.security import get_password_hash

    db = SessionLocal()
    try:
        # ── Seed SUPERUSER ─────────────────────────────────────────
        # Superuser: full access, can promote/demote all users including admins
        # CHANGE THIS PASSWORD after first login!
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
