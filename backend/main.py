from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os

from app.core.database import Base, engine
from app.core.config import settings
from app.api.routes import router
import app.models.user  # Import to register models

# Create tables
Base.metadata.create_all(bind=engine)

# Create upload directories
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
for folder in ["projects", "tutorials", "product_images", "products", "freebies", "freebie_images", "about"]:
    os.makedirs(f"{settings.UPLOAD_DIR}/{folder}", exist_ok=True)

app = FastAPI(
    title="MyWorkSpace API",
    description="Backend API for Tunji Ologun's WorkSpace Portfolio",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", settings.APP_URL],
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

# Seed admin user on startup
@app.on_event("startup")
def seed_admin():
    from app.core.database import SessionLocal
    from app.models.user import User, UserRole
    from app.core.security import get_password_hash
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@workspace.com").first()
        if not admin:
            admin = User(
                full_name="Tunji Ologun",
                email="admin@workspace.com",
                hashed_password=get_password_hash("Admin@123"),
                role=UserRole.admin,
                is_active=True
            )
            db.add(admin)
            db.commit()
            print("✅ Admin user created: admin@workspace.com / Admin@123")
    finally:
        db.close()
