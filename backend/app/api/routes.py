from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Request
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional, List
import json, os, shutil, uuid, stripe, markdown, secrets
from datetime import timedelta, datetime

from app.core.database import get_db
from app.core.config import settings
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    get_current_active_user, require_admin, require_instructor,
    get_optional_user, require_superuser, require_moderator
)
from app.models.user import (
    User, UserRole, Project, Tutorial, Comment, Like, Product, Order, OrderItem,
    Freebie, FreebieDownload, Appointment, ContactMessage, SiteSettings, AboutMe,
    NewsletterSubscriber, Notification, HeroSlide,
    Certification, Education, Client,
    FAQ, BotSettings
)
from app.services.rag_service import (
    chat_with_rag, send_freebie_email, send_freebie_confirm_email, send_purchase_email,
    send_email
)
from pydantic import BaseModel, EmailStr, field_validator, constr
import html as _html

stripe.api_key = settings.STRIPE_SECRET_KEY
router = APIRouter()

# ─── UTILS ────────────────────────────────────────────────────────
# SVG intentionally excluded — SVG files can contain embedded <script> tags
# that execute when served directly from /uploads/ and opened in a browser.
ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
ALLOWED_DOCUMENT_EXTENSIONS = {"pdf", "zip", "docx", "xlsx", "pptx", "ipynb", "csv"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_DOCUMENT_EXTENSIONS

def save_upload(file: UploadFile, folder: str, allowed_exts: set = None) -> str:
    """Save an uploaded file after validating type and size."""
    if file is None or not file.filename:
        raise HTTPException(400, "No file provided")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    permitted = allowed_exts if allowed_exts is not None else ALLOWED_EXTENSIONS
    if ext not in permitted:
        raise HTTPException(400, f"File type '.{ext}' is not allowed. Permitted: {sorted(permitted)}")
    # Read content to check size
    content = file.file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(413, f"File too large. Maximum size is {settings.MAX_FILE_SIZE // 1024 // 1024} MB")
    os.makedirs(f"{settings.UPLOAD_DIR}/{folder}", exist_ok=True)
    filename = f"{uuid.uuid4()}.{ext}"
    path = f"{settings.UPLOAD_DIR}/{folder}/{filename}"
    with open(path, "wb") as f:
        f.write(content)
    return f"/uploads/{folder}/{filename}"

def notify_admins(db: Session, title: str, message: str, link: str = ""):
    """Create in-app notifications for all admins and superusers."""
    admins = db.query(User).filter(
        User.role.in_(["superuser", "admin"]),
        User.is_active == True
    ).all()
    for admin in admins:
        notif = Notification(
            user_id=admin.id,
            title=title,
            message=message,
            link=link
        )
        db.add(notif)
    db.commit()

# ─── AUTH ─────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v

    @field_validator("full_name")
    @classmethod
    def full_name_length(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Full name must be at least 2 characters")
        if len(v) > 100:
            raise ValueError("Full name must not exceed 100 characters")
        return v.strip()

@router.post("/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    confirm_token = secrets.token_urlsafe(32)
    user = User(
        full_name=req.full_name,
        email=req.email,
        phone=req.phone,
        hashed_password=get_password_hash(req.password),
        role=UserRole.guest,
        is_active=True,
        email_confirmed=False,
        confirm_token=confirm_token,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    confirm_url = f"{settings.APP_URL}/confirm-email?token={confirm_token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#040f1e;color:#e8f4ff;border-radius:12px;border:1px solid rgba(0,168,98,0.3)">
      <h2 style="color:#00a862;font-size:1.4rem;margin-bottom:8px">Confirm your email</h2>
      <p style="color:#94a3b8;margin-bottom:8px">Hi {user.full_name},</p>
      <p style="color:#94a3b8;margin-bottom:24px">Click the button below to confirm your email address and activate your account.</p>
      <a href="{confirm_url}" style="display:inline-block;background:#00a862;color:#000;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:1rem">Confirm Email</a>
      <p style="color:#64748b;font-size:0.8rem;margin-top:24px">If you didn't create this account, you can safely ignore this email.</p>
    </div>
    """
    send_email(user.email, "Confirm your MyWorkSpace email", html)
    return {"message": "Account created. Please check your email to confirm your address before logging in."}

@router.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials. Please check your email and password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled. Please contact support.")
    if not user.email_confirmed:
        raise HTTPException(status_code=403, detail="UNCONFIRMED_EMAIL")
    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token, "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "role": user.role.value,
                 "full_name": user.full_name, "avatar_url": user.avatar_url}
    }

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    def password_strength(cls, v: str) -> str:
        import re
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain an uppercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain a number")
        return v

@router.post("/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    from datetime import timezone
    user = db.query(User).filter(User.email == req.email).first()
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If that email exists, a reset link has been sent."}
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()
    reset_url = f"{settings.APP_URL}/reset-password?token={token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#040f1e;color:#e8f4ff;border-radius:12px;border:1px solid rgba(0,168,98,0.3)">
      <h2 style="color:#00a862;font-size:1.4rem;margin-bottom:8px">Password Reset</h2>
      <p style="color:#94a3b8;margin-bottom:24px">Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
      <a href="{reset_url}" style="display:inline-block;background:#00a862;color:#000;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:1rem">Reset Password</a>
      <p style="color:#64748b;font-size:0.8rem;margin-top:24px">If you didn't request this, you can safely ignore this email.</p>
    </div>
    """
    send_email(user.email, "Reset your MyWorkSpace password", html)
    return {"message": "If that email exists, a reset link has been sent."}

@router.post("/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    from datetime import timezone
    user = db.query(User).filter(User.reset_token == req.token).first()
    if not user or not user.reset_token_expires:
        raise HTTPException(400, "Invalid or expired reset link.")
    if datetime.now(timezone.utc) > user.reset_token_expires.replace(tzinfo=timezone.utc):
        raise HTTPException(400, "Reset link has expired. Please request a new one.")
    user.hashed_password = get_password_hash(req.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return {"message": "Password updated successfully. You can now log in."}

@router.get("/auth/confirm-email")
def confirm_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.confirm_token == token).first()
    if not user:
        raise HTTPException(400, "Invalid or already used confirmation link.")
    user.email_confirmed = True
    user.confirm_token = None
    db.commit()
    return {"message": "Email confirmed! You can now log in."}

@router.post("/auth/resend-confirmation")
def resend_confirmation(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or user.email_confirmed:
        return {"message": "If that email exists and is unconfirmed, a new link has been sent."}
    confirm_token = secrets.token_urlsafe(32)
    user.confirm_token = confirm_token
    db.commit()
    confirm_url = f"{settings.APP_URL}/confirm-email?token={confirm_token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#040f1e;color:#e8f4ff;border-radius:12px;border:1px solid rgba(0,168,98,0.3)">
      <h2 style="color:#00a862;font-size:1.4rem;margin-bottom:8px">Confirm your email</h2>
      <p style="color:#94a3b8;margin-bottom:24px">Click the button below to confirm your email address and activate your account.</p>
      <a href="{confirm_url}" style="display:inline-block;background:#00a862;color:#000;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:1rem">Confirm Email</a>
    </div>
    """
    send_email(user.email, "Confirm your MyWorkSpace email", html)
    return {"message": "If that email exists and is unconfirmed, a new link has been sent."}

@router.get("/auth/me")
def get_me(current_user: User = Depends(get_current_active_user)):
    return {
        "id": current_user.id, "email": current_user.email,
        "role": current_user.role.value, "full_name": current_user.full_name,
        "avatar_url": current_user.avatar_url
    }

# ─── CHAT ────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    message: str
    history: List[dict] = []

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        if len(v) > 2000:
            raise ValueError("Message must not exceed 2000 characters")
        return v

    @field_validator("history")
    @classmethod
    def history_max_length(cls, v: list) -> list:
        return v[-20:] if len(v) > 20 else v  # cap history to last 20 turns

@router.post("/chat")
async def chat(req: ChatMessage, db: Session = Depends(get_db)):
    return await chat_with_rag(req.message, req.history, db)

# ─── SITE SETTINGS (public read, admin write) ─────────────────────
# NOTE: Specific sub-routes MUST be declared before the wildcard {key}
# routes so FastAPI matches them first.

class HeroPhrasesRequest(BaseModel):
    phrase1: str
    phrase2: str
    phrase3: str

@router.get("/site-settings/hero-phrases")
def get_hero_phrases(db: Session = Depends(get_db)):
    s = db.query(SiteSettings).filter(SiteSettings.key == "hero_phrases").first()
    if s:
        import json as _json
        try:
            phrases = _json.loads(s.value)
            return {"phrases": phrases}
        except Exception:
            pass
    return {"phrases": [
        "Welcome To My Workspace",
        "I Offer Data/AI Powered Solutions",
        "Be My Guest"
    ]}

@router.put("/admin/site-settings/hero-phrases")
def update_hero_phrases(
    req: HeroPhrasesRequest,
    db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    import json as _json
    phrases = [req.phrase1.strip(), req.phrase2.strip(), req.phrase3.strip()]
    if any(len(p) == 0 for p in phrases):
        raise HTTPException(400, "All three phrases must be non-empty.")
    value = _json.dumps(phrases)
    s = db.query(SiteSettings).filter(SiteSettings.key == "hero_phrases").first()
    if not s:
        s = SiteSettings(key="hero_phrases", value=value)
        db.add(s)
    else:
        s.value = value
    db.commit()
    return {"success": True, "phrases": phrases}

@router.get("/site-settings/{key}")
def get_site_setting(key: str, db: Session = Depends(get_db)):
    s = db.query(SiteSettings).filter(SiteSettings.key == key).first()
    if not s:
        raise HTTPException(404, "Setting not found")
    return {"key": s.key, "value": s.value}

@router.put("/admin/site-settings/{key}")
def set_site_setting(
    key: str, value: str = Form(...),
    db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    s = db.query(SiteSettings).filter(SiteSettings.key == key).first()
    if not s:
        s = SiteSettings(key=key, value=value)
        db.add(s)
    else:
        s.value = value
    db.commit()
    return {"success": True}

@router.put("/admin/site-settings/chatbot_photo/upload")
async def upload_chatbot_photo(
    photo: UploadFile = File(...),
    db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    photo_url = save_upload(photo, "settings")
    s = db.query(SiteSettings).filter(SiteSettings.key == "chatbot_photo").first()
    if not s:
        s = SiteSettings(key="chatbot_photo", value=photo_url)
        db.add(s)
    else:
        s.value = photo_url
    db.commit()
    return {"success": True, "url": photo_url}

# ─── HERO SLIDES ──────────────────────────────────────────────────
@router.get("/hero-slides")
def get_hero_slides(db: Session = Depends(get_db)):
    """Public endpoint — returns active slides ordered for the homepage."""
    slides = (
        db.query(HeroSlide)
        .filter(HeroSlide.is_active == True)
        .order_by(HeroSlide.order_index)
        .limit(5)
        .all()
    )
    return [
        {
            "id": s.id,
            "image_url": s.image_url,
            "caption": s.caption,
            "subtitle": s.subtitle,
            "link_url": s.link_url,
            "order_index": s.order_index,
            "tutorial_slug": s.tutorial.slug if s.tutorial and s.tutorial.is_published else None,
        }
        for s in slides
    ]

@router.get("/admin/hero-slides")
def admin_get_hero_slides(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    slides = db.query(HeroSlide).order_by(HeroSlide.order_index).all()
    return [
        {
            "id": s.id,
            "image_url": s.image_url,
            "caption": s.caption,
            "subtitle": s.subtitle,
            "link_url": s.link_url,
            "order_index": s.order_index,
            "is_active": s.is_active,
            "tutorial_id": s.tutorial_id,
        }
        for s in slides
    ]

@router.post("/admin/hero-slides")
async def create_hero_slide(
    caption: str = Form(""),
    subtitle: str = Form(""),
    link_url: str = Form(""),
    order_index: int = Form(0),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    active_count = db.query(HeroSlide).filter(HeroSlide.is_active == True).count()
    if active_count >= 5:
        raise HTTPException(400, "Maximum of 5 active slides allowed.")
    image_url = save_upload(image, "hero_slides")
    slide = HeroSlide(
        image_url=image_url,
        caption=caption,
        subtitle=subtitle,
        link_url=link_url or None,
        order_index=order_index,
    )
    db.add(slide)
    db.commit()
    db.refresh(slide)
    return {"id": slide.id, "image_url": slide.image_url}

@router.put("/admin/hero-slides/{id}")
async def update_hero_slide(
    id: int,
    caption: str = Form(""),
    subtitle: str = Form(""),
    link_url: str = Form(""),
    order_index: int = Form(0),
    is_active: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    slide = db.query(HeroSlide).filter(HeroSlide.id == id).first()
    if not slide:
        raise HTTPException(404, "Slide not found.")
    if is_active and not slide.is_active:
        active_count = db.query(HeroSlide).filter(HeroSlide.is_active == True).count()
        if active_count >= 5:
            raise HTTPException(400, "Maximum of 5 active slides allowed.")
    slide.caption = caption
    slide.subtitle = subtitle
    slide.link_url = link_url or None
    slide.order_index = order_index
    slide.is_active = is_active
    if image and image.filename:
        slide.image_url = save_upload(image, "hero_slides")
    db.commit()
    return {"success": True}

@router.delete("/admin/hero-slides/{id}")
def delete_hero_slide(id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    slide = db.query(HeroSlide).filter(HeroSlide.id == id).first()
    if slide:
        db.delete(slide)
        db.commit()
    return {"success": True}

# ─── PROJECTS ────────────────────────────────────────────────────
@router.get("/projects")
def get_projects(category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Project)
    if category:
        q = q.filter(Project.category == category)
    projects = q.order_by(Project.order_index).all()
    return [{"id": p.id, "title": p.title, "slug": p.slug, "category": p.category,
             "summary": p.summary, "description": p.description, "image_url": p.image_url,
             "source_code_url": p.source_code_url,
             "tech_stack": (lambda s: __import__("json").loads(s) if s else [])(p.tech_stack) if p.tech_stack and p.tech_stack.strip().startswith("[") else (p.tech_stack.split(",") if p.tech_stack else []),
             "github_url": p.github_url, "live_url": p.live_url,
             "is_featured": p.is_featured, "order_index": p.order_index, "notebook_url": p.notebook_url or "", "publish_to_blog": p.publish_to_blog}
            for p in projects]


@router.get("/blog")
def get_blog_posts(db: Session = Depends(get_db)):
    posts = db.query(Project).filter(Project.publish_to_blog == True).order_by(Project.order_index).all()
    return [{
        "id": p.id, "title": p.title, "slug": p.slug, "category": p.category,
        "summary": p.summary, "image_url": p.image_url,
        "tech_stack": (lambda s: __import__("json").loads(s) if s and s.strip().startswith("[") else (s.split(",") if s else []))(p.tech_stack),
        "publish_to_blog": p.publish_to_blog, "created_at": str(p.created_at),
    } for p in posts]

@router.get("/projects/{slug}")
def get_project(slug: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.slug == slug).first()
    if not p:
        raise HTTPException(404, "Project not found")
    return {"id": p.id, "title": p.title, "slug": p.slug, "category": p.category,
            "summary": p.summary, "description": p.description, "image_url": p.image_url,
            "source_code_url": p.source_code_url or "",
            "notebook_url": p.notebook_url or "",
            "publish_to_blog": p.publish_to_blog,
            "is_featured": p.is_featured, "order_index": p.order_index,
            "tech_stack": (lambda s: __import__("json").loads(s) if s and s.strip().startswith("[") else (s.split(",") if s else []))(p.tech_stack),
            "github_url": p.github_url, "live_url": p.live_url}


@router.delete("/admin/projects/{id}/file/{field}")
def clear_project_file(id: int, field: str, db: Session = Depends(get_db), _: User = Depends(require_instructor)):
    allowed = ["image_url", "source_code_url", "notebook_url"]
    if field not in allowed:
        raise HTTPException(400, "Invalid field")
    p = db.query(Project).filter(Project.id == id).first()
    if not p:
        raise HTTPException(404, "Not found")
    import os
    url = getattr(p, field)
    if url:
        path = f"{settings.UPLOAD_DIR}/{url.replace('/uploads/', '')}"
        try:
            if os.path.exists(path): os.remove(path)
        except: pass
    setattr(p, field, None)
    db.commit()
    return {"success": True}

@router.post("/admin/projects")
async def create_project(
    title: str = Form(...),
    category: str = Form(...),
    summary: str = Form(...),        # max 300 words — shown on card & hero
    description: str = Form(""),     # unlimited — full project detail page
    tech_stack: str = Form("[]"),
    github_url: str = Form(""),
    live_url: str = Form(""),
    is_featured: bool = Form(False),
    order_index: int = Form(0),
    image: Optional[UploadFile] = File(None),
    source_code: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), _: User = Depends(require_instructor)
):
    # Enforce 300-word limit on summary server-side
    word_count = len(summary.split())
    if word_count > 300:
        raise HTTPException(400, f"Summary exceeds 300 words ({word_count} words). Please shorten it.")
    slug = title.lower().replace(" ", "-").replace("/", "-")[:100]
    # Ensure unique slug
    base_slug = slug
    counter = 1
    while db.query(Project).filter(Project.slug == slug).first():
        slug = f"{base_slug}-{counter}"; counter += 1
    image_url = save_upload(image, "projects") if image else ""
    source_code_url = save_upload(source_code, "project_sourcecode") if source_code else ""
    p = Project(title=title, slug=slug, category=category, summary=summary,
                description=description, tech_stack=tech_stack,
                github_url=github_url, live_url=live_url,
                is_featured=is_featured, order_index=order_index,
                image_url=image_url, source_code_url=source_code_url)
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "slug": p.slug}

@router.put("/admin/projects/{id}")
async def update_project(
    id: int,
    title: str = Form(...),
    category: str = Form(...),
    summary: str = Form(...),
    description: str = Form(""),
    tech_stack: str = Form("[]"),
    github_url: str = Form(""),
    live_url: str = Form(""),
    is_featured: bool = Form(False),
    order_index: int = Form(0),
    image: Optional[UploadFile] = File(None),
    source_code: Optional[UploadFile] = File(None),
    notebook: Optional[UploadFile] = File(None),
    publish_to_blog: bool = Form(False),
    db: Session = Depends(get_db), _: User = Depends(require_instructor)
):
    import re as _re
    plain_summary = _re.sub(r'<[^>]+>', ' ', summary)
    word_count = len(plain_summary.split())
    if word_count > 300:
        raise HTTPException(400, f"Summary exceeds 300 words ({word_count} words).")
    p = db.query(Project).filter(Project.id == id).first()
    if not p:
        raise HTTPException(404, "Not found")
    p.title = title; p.category = category; p.summary = summary
    p.description = description; p.tech_stack = tech_stack
    p.publish_to_blog = publish_to_blog
    if notebook and notebook.filename:
        from uuid import uuid4
        nb_name = f"{uuid4()}.ipynb"
        nb_path = f"{settings.UPLOAD_DIR}/projects/{nb_name}"
        with open(nb_path, "wb") as f: f.write(await notebook.read())
        p.notebook_url = f"/uploads/projects/{nb_name}"
    p.github_url = github_url; p.live_url = live_url
    p.is_featured = is_featured; p.order_index = order_index
    if image:
        p.image_url = save_upload(image, "projects")
    if source_code:
        p.source_code_url = save_upload(source_code, "project_sourcecode")
    db.commit()
    return {"success": True}

@router.delete("/admin/projects/{id}")
def delete_project(id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    p = db.query(Project).filter(Project.id == id).first()
    if p:
        db.delete(p)
        db.commit()
    return {"success": True}

# ─── TUTORIALS ───────────────────────────────────────────────────
@router.get("/tutorials")
def get_tutorials(category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Tutorial).filter(Tutorial.is_published == True)
    if category:
        q = q.filter(Tutorial.category == category)
    tutorials = q.order_by(Tutorial.created_at.desc()).limit(30).all()
    return [{"id": t.id, "title": t.title, "slug": t.slug, "summary": t.summary,
             "content": t.content, "image_url": t.image_url, "video_url": t.video_url,
             "category": t.category, "views": t.views, "created_at": str(t.created_at),
             "author": t.author.full_name if t.author else "Admin",
             "likes_count": len(t.likes), "comments_count": len(t.comments)}
            for t in tutorials]

@router.get("/tutorials/{slug}/comments")
def get_comments(slug: str, db: Session = Depends(get_db)):
    t = db.query(Tutorial).filter(Tutorial.slug == slug).first()
    if not t:
        raise HTTPException(404, "Not found")
    return [{"id": c.id, "content": c.content, "user": c.user.full_name if c.user else "Anonymous", "created_at": str(c.created_at)} for c in t.comments]

@router.post("/tutorials/{slug}/comments")
def add_comment(slug: str, body: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    t = db.query(Tutorial).filter(Tutorial.slug == slug).first()
    if not t:
        raise HTTPException(404, "Not found")
    c = Comment(content=body.get("content", "").strip(), user_id=current_user.id, tutorial_id=t.id)
    if not c.content:
        raise HTTPException(400, "Comment cannot be empty")
    db.add(c)
    db.commit()
    return {"success": True}

@router.post("/tutorials/{slug}/like")
def like_by_slug(slug: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    t = db.query(Tutorial).filter(Tutorial.slug == slug).first()
    if not t:
        raise HTTPException(404, "Not found")
    existing = db.query(Like).filter(Like.user_id == current_user.id, Like.tutorial_id == t.id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"liked": False}
    db.add(Like(user_id=current_user.id, tutorial_id=t.id))
    db.commit()
    return {"liked": True}

@router.get("/tutorials/{slug}")
def get_tutorial(slug: str, db: Session = Depends(get_db)):
    t = db.query(Tutorial).filter(Tutorial.slug == slug, Tutorial.is_published == True).first()
    if not t:
        raise HTTPException(404, "Not found")
    t.views = (t.views or 0) + 1
    db.commit()
    html_content = markdown.markdown(t.content or "", extensions=["fenced_code", "codehilite", "tables"])
    return {"id": t.id, "title": t.title, "slug": t.slug, "content": t.content,
            "content_html": html_content, "summary": t.summary, "image_url": t.image_url,
            "video_url": t.video_url, "category": t.category, "views": t.views,
            "created_at": str(t.created_at),
            "author": t.author.full_name if t.author else "Admin",
            "likes_count": len(t.likes),
            "comments": [{"id": c.id, "content": c.content, "user": c.user.full_name,
                           "created_at": str(c.created_at)} for c in t.comments]}

@router.post("/admin/tutorials")
async def create_tutorial(
    title: str = Form(...), content: str = Form(...), summary: str = Form(""),
    category: str = Form("general"), video_url: str = Form(""), is_published: bool = Form(False),
    tech_stack: str = Form(""), github_url: str = Form(""), live_url: str = Form(""), notebook_url: str = Form(""),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), current_user: User = Depends(require_instructor),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    slug = title.lower().replace(" ", "-")[:100] + f"-{uuid.uuid4().hex[:6]}"
    image_url = save_upload(image, "tutorials") if image else ""
    t = Tutorial(title=title, slug=slug, content=content, summary=summary,
                 category=category, video_url=video_url, is_published=is_published,
                 tech_stack=tech_stack, github_url=github_url, live_url=live_url, notebook_url=notebook_url,
                 author_id=current_user.id, image_url=image_url)
    db.add(t)
    db.commit()
    db.refresh(t)
    # Notify newsletter subscribers when published
    if is_published:
        background_tasks.add_task(_notify_subscribers_new_tutorial, t.id, db)
    return {"id": t.id, "slug": t.slug}

@router.put("/admin/tutorials/{id}")
async def update_tutorial(
    id: int, title: str = Form(...), content: str = Form(...), summary: str = Form(""),
    category: str = Form("general"), video_url: str = Form(""), is_published: bool = Form(False),
    tech_stack: str = Form(""), github_url: str = Form(""), live_url: str = Form(""), notebook_url: str = Form(""),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), _: User = Depends(require_instructor),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    t = db.query(Tutorial).filter(Tutorial.id == id).first()
    if not t:
        raise HTTPException(404, "Not found")
    was_published = t.is_published
    t.title = title; t.content = content; t.summary = summary
    t.category = category; t.video_url = video_url; t.is_published = is_published
    t.tech_stack = tech_stack; t.github_url = github_url; t.live_url = live_url; t.notebook_url = notebook_url
    if image:
        t.image_url = save_upload(image, "tutorials")
    db.commit()
    # Only notify when flipping to published for the first time
    if is_published and not was_published:
        background_tasks.add_task(_notify_subscribers_new_tutorial, t.id, db)
    return {"success": True}

@router.delete("/admin/tutorials/{id}")
def delete_tutorial(id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    t = db.query(Tutorial).filter(Tutorial.id == id).first()
    if t:
        db.delete(t)
        db.commit()
    return {"success": True}






# ─── PRODUCTS / SHOP ─────────────────────────────────────────────
@router.get("/products")
def get_products(category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Product).filter(Product.is_active == True)
    if category:
        q = q.filter(Product.category == category)
    products = q.all()
    return [{"id": p.id, "title": p.title, "slug": p.slug, "description": p.description,
             "price": p.price, "image_url": p.image_url, "category": p.category, "downloads": p.downloads}
            for p in products]

@router.get("/products/{slug}")
def get_product(slug: str, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.slug == slug, Product.is_active == True).first()
    if not p:
        raise HTTPException(404, "Not found")
    return {"id": p.id, "title": p.title, "slug": p.slug, "description": p.description,
            "price": p.price, "image_url": p.image_url, "category": p.category}

class QuickBuyRequest(BaseModel):
    product_id: int
    customer_email: EmailStr
    customer_name: str

    @field_validator("customer_name")
    @classmethod
    def name_length(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v.strip()

@router.post("/shop/quick-buy")
async def quick_buy(req: QuickBuyRequest, db: Session = Depends(get_db)):
    """Buy directly from gallery card without visiting product page."""
    product_id, customer_email, customer_name = req.product_id, req.customer_email, req.customer_name
    product = db.query(Product).filter(Product.id == product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(404, "Product not found")
    line_items = [{"price_data": {"currency": "usd", "product_data": {"name": product.title},
                                   "unit_amount": int(product.price * 100)}, "quantity": 1}]
    order = Order(customer_email=customer_email, customer_name=customer_name,
                  total_amount=product.price, status="pending")
    db.add(order)
    db.commit()
    db.refresh(order)
    db.add(OrderItem(order_id=order.id, product_id=product.id, price=product.price))
    db.commit()
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"], line_items=line_items, mode="payment",
            customer_email=customer_email,
            success_url=f"{settings.APP_URL}/shop/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.APP_URL}/shop",
            metadata={"order_id": str(order.id), "customer_name": customer_name}
        )
    except stripe.error.StripeError as e:
        # Roll back the pending order if Stripe session creation fails
        db.delete(order)
        db.commit()
        raise HTTPException(502, f"Payment provider error: {str(e)[:100]}")
    order.stripe_session_id = session.id
    db.commit()
    return {"checkout_url": session.url, "session_id": session.id}

# ─── SITE LOGO CMS ────────────────────────────────────────────────
@router.put("/admin/site-settings/logo/upload")
async def upload_site_logo(
    logo: UploadFile = File(...),
    db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    """Upload/replace the site logo. Stored in SiteSettings key='site_logo'."""
    logo_url = save_upload(logo, "settings")
    s = db.query(SiteSettings).filter(SiteSettings.key == "site_logo").first()
    if not s:
        s = SiteSettings(key="site_logo", value=logo_url)
        db.add(s)
    else:
        s.value = logo_url
    db.commit()
    return {"success": True, "url": logo_url}

@router.get("/site-settings/logo/current")
def get_site_logo(db: Session = Depends(get_db)):
    s = db.query(SiteSettings).filter(SiteSettings.key == "site_logo").first()
    return {"url": s.value if s else None}

# ─── SHOP CHECKOUT (Stripe checkout sessions) ─────────────────────
class CheckoutRequest(BaseModel):
    product_ids: List[int]
    customer_email: str
    customer_name: str

@router.post("/shop/checkout")
async def create_checkout(req: CheckoutRequest, db: Session = Depends(get_db)):
    product_ids, customer_email, customer_name = req.product_ids, req.customer_email, req.customer_name

    products = db.query(Product).filter(Product.id.in_(product_ids), Product.is_active == True).all()
    if not products:
        raise HTTPException(400, "No valid products")
    line_items = [{"price_data": {"currency": "usd", "product_data": {"name": p.title},
                                   "unit_amount": int(p.price * 100)}, "quantity": 1} for p in products]
    order = Order(customer_email=customer_email, customer_name=customer_name,
                  total_amount=sum(p.price for p in products), status="pending")
    db.add(order)
    db.commit()
    db.refresh(order)
    for p in products:
        db.add(OrderItem(order_id=order.id, product_id=p.id, price=p.price))
    db.commit()
    session = stripe.checkout.Session.create(
        payment_method_types=["card"], line_items=line_items, mode="payment",
        customer_email=customer_email,
        success_url=f"{settings.APP_URL}/shop/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.APP_URL}/shop",
        metadata={"order_id": str(order.id), "customer_name": customer_name}
    )
    order.stripe_session_id = session.id
    db.commit()
    return {"checkout_url": session.url, "session_id": session.id}

@router.post("/shop/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(body, sig, settings.STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(400, "Invalid signature")
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        order = db.query(Order).filter(Order.stripe_session_id == session["id"]).first()
        if order:
            order.status = "paid"
            order.stripe_payment_intent = session.get("payment_intent")
            db.commit()
            items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
            products = [db.query(Product).filter(Product.id == item.product_id).first() for item in items]
            for p in products:
                if p:
                    p.downloads = (p.downloads or 0) + 1
            db.commit()
            download_urls = [f"{settings.BACKEND_URL}{p.file_url}" for p in products if p and p.file_url]
            product_list = [{"title": p.title} for p in products if p]
            send_purchase_email(order.customer_email, order.customer_name, product_list, download_urls)
    return {"received": True}

@router.post("/admin/products")
async def create_product(
    title: str = Form(...), live_url: str = Form(""), description: str = Form(""), price: float = Form(...),
    category: str = Form("ebook"),
    image: Optional[UploadFile] = File(None),
    digital_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    slug = title.lower().replace(" ", "-")[:100] + f"-{uuid.uuid4().hex[:6]}"
    image_url = save_upload(image, "product_images") if image else ""
    file_url, file_name = "", ""
    if digital_file:
        file_url = save_upload(digital_file, "products")
        file_name = digital_file.filename
    p = Product(title=title, slug=slug, description=description, price=price,
                category=category, image_url=image_url, file_url=file_url, file_name=file_name)
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "slug": p.slug}

@router.put("/admin/products/{id}")
async def update_product(
    id: int, title: str = Form(...), description: str = Form(""), price: float = Form(...),
    category: str = Form("ebook"), is_active: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    digital_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    p = db.query(Product).filter(Product.id == id).first()
    if not p:
        raise HTTPException(404, "Not found")
    p.title = title; p.description = description; p.price = price
    p.category = category; p.is_active = is_active
    if image:
        p.image_url = save_upload(image, "product_images")
    if digital_file:
        p.file_url = save_upload(digital_file, "products")
        p.file_name = digital_file.filename
    db.commit()
    return {"success": True}

@router.delete("/admin/products/{id}")
def delete_product(id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    p = db.query(Product).filter(Product.id == id).first()
    if p:
        db.delete(p)
        db.commit()
    return {"success": True}

# ─── FREEBIES ────────────────────────────────────────────────────
@router.get("/freebies")
def get_freebies(db: Session = Depends(get_db)):
    freebies = db.query(Freebie).filter(Freebie.is_active == True).all()
    return [{"id": f.id, "title": f.title, "description": f.description,
             "image_url": f.image_url, "category": f.category, "downloads": f.downloads}
            for f in freebies]

class FreebieDownloadRequest(BaseModel):
    freebie_id: int
    full_name: str
    email: EmailStr

@router.post("/freebies/download")
async def request_freebie(
    req: FreebieDownloadRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    freebie = db.query(Freebie).filter(Freebie.id == req.freebie_id, Freebie.is_active == True).first()
    if not freebie:
        raise HTTPException(404, "Freebie not found")
    token = secrets.token_urlsafe(32)
    record = FreebieDownload(freebie_id=req.freebie_id, email=req.email, full_name=req.full_name,
                              confirm_token=token, is_confirmed=False)
    db.add(record)
    db.commit()
    confirm_url = f"{settings.APP_URL}/freebies/confirm?token={token}"
    background_tasks.add_task(send_freebie_confirm_email, req.email, req.full_name, freebie.title, confirm_url)
    return {"message": "Please check your email to confirm your address and get your download link."}

@router.get("/freebies/confirm")
def confirm_freebie_download(token: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    record = db.query(FreebieDownload).filter(FreebieDownload.confirm_token == token).first()
    if not record:
        raise HTTPException(404, "Invalid or expired confirmation link")
    # Tokens expire after 24 hours
    from datetime import timezone as _tz
    if record.created_at:
        age = datetime.now(_tz.utc) - record.created_at.replace(tzinfo=_tz.utc)
        if age.total_seconds() > 86400 and not record.is_confirmed:
            raise HTTPException(410, "Confirmation link has expired. Please request a new download link.")
    freebie = db.query(Freebie).filter(Freebie.id == record.freebie_id).first()
    if not freebie:
        raise HTTPException(404, "Freebie not found")
    download_url = f"{settings.APP_URL}/api{freebie.file_url}"
    if record.is_confirmed:
        return {"already_confirmed": True, "download_url": download_url, "title": freebie.title, "name": record.full_name}
    record.is_confirmed = True
    freebie.downloads = (freebie.downloads or 0) + 1
    db.commit()
    notify_admins(db, title="📥 New Freebie Download",
                  message=f"{record.full_name} ({record.email}) confirmed download of '{freebie.title}'.",
                  link="/admin#freebies")
    background_tasks.add_task(send_freebie_email, record.email, record.full_name, freebie.title, download_url)
    return {"download_url": download_url, "title": freebie.title, "name": record.full_name}


@router.post("/admin/freebies")
async def create_freebie(
    title: str = Form(...), description: str = Form(""), category: str = Form("ebook"),
    image: Optional[UploadFile] = File(None),
    digital_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    image_url = save_upload(image, "freebie_images") if image else ""
    file_url = save_upload(digital_file, "freebies") if digital_file else ""
    file_name = digital_file.filename if digital_file else ""
    f = Freebie(title=title, description=description, category=category,
                image_url=image_url, file_url=file_url, file_name=file_name)
    db.add(f)
    db.commit()
    db.refresh(f)
    return {"id": f.id}

@router.put("/admin/freebies/{id}")
async def update_freebie(
    id: int, title: str = Form(...), description: str = Form(""),
    category: str = Form("ebook"), is_active: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    digital_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    f = db.query(Freebie).filter(Freebie.id == id).first()
    if not f:
        raise HTTPException(404, "Freebie not found")
    f.title = title; f.description = description; f.category = category; f.is_active = is_active
    if image:
        f.image_url = save_upload(image, "freebie_images")
    if digital_file:
        f.file_url = save_upload(digital_file, "freebies")
        f.file_name = digital_file.filename
    db.commit()
    return {"success": True}

@router.delete("/admin/freebies/{id}")
def delete_freebie(id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    f = db.query(Freebie).filter(Freebie.id == id).first()
    if f:
        db.delete(f)
        db.commit()
    return {"success": True}

@router.get("/admin/freebies/downloads")
def get_freebie_downloads(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Returns each freebie with its download count and list of downloaders."""
    freebies = db.query(Freebie).all()
    result = []
    for f in freebies:
        downloads = db.query(FreebieDownload).filter(FreebieDownload.freebie_id == f.id)\
                      .order_by(FreebieDownload.created_at.desc()).all()
        result.append({
            "id": f.id, "title": f.title, "category": f.category,
            "total_downloads": f.downloads or 0,
            "downloaders": [{"name": d.full_name, "email": d.email,
                              "date": str(d.created_at)} for d in downloads]
        })
    return result

# ─── CONTACT ─────────────────────────────────────────────────────
class ContactRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str

    @field_validator("message")
    @classmethod
    def message_length(cls, v: str) -> str:
        if len(v.strip()) < 5:
            raise ValueError("Message must be at least 5 characters")
        if len(v) > 5000:
            raise ValueError("Message must not exceed 5000 characters")
        return v.strip()

    @field_validator("full_name")
    @classmethod
    def full_name_length(cls, v: str) -> str:
        if len(v) > 200:
            raise ValueError("Name must not exceed 200 characters")
        return v
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None

@router.post("/contact")
def submit_contact(req: ContactRequest, db: Session = Depends(get_db)):
    msg = ContactMessage(full_name=req.full_name, email=req.email,
                         phone=req.phone, message=req.message,
                         preferred_date=req.preferred_date, preferred_time=req.preferred_time)
    db.add(msg)
    db.commit()
    # Send email notification to admin — escape all user-supplied values before
    # embedding in HTML to prevent HTML injection in admin's mail client.
    try:
        safe_name    = _html.escape(req.full_name)
        safe_email   = _html.escape(req.email)
        safe_phone   = _html.escape(req.phone or "—")
        safe_message = _html.escape(req.message)
        safe_date    = _html.escape(req.preferred_date or "—")
        safe_time    = _html.escape(req.preferred_time or "—")
        date_time_line = ""
        if req.preferred_date or req.preferred_time:
            date_time_line = f"<p><strong>Preferred Date:</strong> {safe_date} &nbsp; <strong>Time:</strong> {safe_time}</p>"
        send_email(
            to_email=settings.ADMIN_EMAIL,
            subject=f"📩 New Contact Message from {safe_name}",
            html_body=f"""
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#020c18;color:#e8f4ff;padding:30px;border-radius:12px;border:1px solid rgba(0,168,98,0.3)">
              <h2 style="color:#00a862;margin-bottom:20px">New Contact Message</h2>
              <p><strong>Name:</strong> {safe_name}</p>
              <p><strong>Email:</strong> {safe_email}</p>
              <p><strong>Phone:</strong> {safe_phone}</p>
              {date_time_line}
              <hr style="border-color:rgba(0,168,98,0.2);margin:20px 0"/>
              <p><strong>Message:</strong></p>
              <p style="background:rgba(0,168,98,0.05);padding:15px;border-radius:8px;border-left:3px solid #00a862;white-space:pre-wrap">{safe_message}</p>
              <hr style="border-color:rgba(0,168,98,0.2);margin:20px 0"/>
              <p style="font-size:12px;color:#6b7280">Sent from MyWorkSpace Contact Form</p>
            </div>
            """
        )
    except Exception as e:
        print(f"Email notification failed: {e}")
    return {"success": True, "message": "Message sent successfully!"}

@router.get("/admin/contacts")
def get_contacts(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    msgs = db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).all()
    return [{"id": m.id, "full_name": m.full_name, "email": m.email, "phone": m.phone,
             "message": m.message, "preferred_date": m.preferred_date, "preferred_time": m.preferred_time,
             "is_read": m.is_read, "created_at": str(m.created_at)}
            for m in msgs]

@router.delete("/admin/contacts/{mid}")
def delete_contact(mid: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    m = db.query(ContactMessage).filter(ContactMessage.id == mid).first()
    if not m: raise HTTPException(404, "Not found")
    db.delete(m); db.commit()
    return {"success": True}

# ─── APPOINTMENTS (admin view; auto-marks past appts as completed) ───
@router.get("/admin/appointments")
def get_appointments(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    from datetime import datetime
    appts = db.query(Appointment).order_by(Appointment.created_at.desc()).all()
    now = datetime.now()
    changed = False
    for a in appts:
        if a.status in ("pending", "confirmed") and a.preferred_date and a.preferred_time:
            try:
                appt_dt = datetime.strptime(f"{a.preferred_date} {a.preferred_time}", "%Y-%m-%d %H:%M")
                if appt_dt < now:
                    a.status = "completed"
                    changed = True
            except Exception:
                pass
    if changed:
        db.commit()
    return [{"id": a.id, "full_name": a.full_name, "email": a.email, "phone": a.phone,
             "message": a.message, "preferred_date": a.preferred_date, "preferred_time": a.preferred_time,
             "status": a.status, "created_at": str(a.created_at)} for a in appts]

# ─── NEWSLETTER ──────────────────────────────────────────────────
class SubscribeRequest(BaseModel):
    full_name: str
    email: EmailStr

@router.post("/newsletter/subscribe")
def newsletter_subscribe(req: SubscribeRequest, background_tasks: BackgroundTasks,
                         db: Session = Depends(get_db)):
    existing = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == req.email).first()
    if existing:
        if existing.is_confirmed:
            raise HTTPException(400, detail="This email is already subscribed.")
        # Resend confirmation
        token = existing.confirm_token
    else:
        token = secrets.token_urlsafe(32)
        sub = NewsletterSubscriber(full_name=req.full_name, email=req.email,
                                   confirm_token=token, is_confirmed=False)
        db.add(sub)
        db.commit()

    confirm_url = f"{settings.APP_URL}/api/newsletter/confirm/{token}"
    background_tasks.add_task(
        send_email,
        to_email=req.email,
        subject="Confirm your MyWorkSpace newsletter subscription",
        html_body=f"""
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:32px;background:#020c18;color:#e2e8f0;border-radius:12px;">
          <h2 style="color:#00a862;">Almost there, {req.full_name}! 👋</h2>
          <p>Thank you for subscribing to the <strong>MyWorkSpace</strong> newsletter.</p>
          <p>Please confirm your email address to start receiving tutorial notifications and free downloads:</p>
          <a href="{confirm_url}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#00a862;color:#000;font-weight:bold;border-radius:8px;text-decoration:none;">
            ✅ Confirm Subscription
          </a>
          <p style="font-size:12px;color:#64748b;">If you did not request this, you can safely ignore this email.</p>
        </div>
        """
    )
    return {"success": True, "message": "Confirmation email sent. Please check your inbox."}

@router.get("/newsletter/confirm/{token}")
def newsletter_confirm(token: str, db: Session = Depends(get_db)):
    frontend_url = settings.APP_URL
    sub = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.confirm_token == token).first()
    if not sub:
        return RedirectResponse(url=f"{frontend_url}/newsletter/confirmed?status=invalid")
    if sub.is_confirmed:
        return RedirectResponse(url=f"{frontend_url}/newsletter/confirmed?status=already")
    sub.is_confirmed = True
    sub.confirmed_at = datetime.utcnow()
    sub.confirm_token = None
    db.commit()
    return RedirectResponse(url=f"{frontend_url}/newsletter/confirmed?status=success")

@router.get("/admin/newsletter/subscribers")
def get_subscribers(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    subs = db.query(NewsletterSubscriber).order_by(NewsletterSubscriber.created_at.desc()).all()
    return [{"id": s.id, "full_name": s.full_name, "email": s.email,
             "is_confirmed": s.is_confirmed, "created_at": str(s.created_at),
             "confirmed_at": str(s.confirmed_at) if s.confirmed_at else None}
            for s in subs]

@router.post("/admin/newsletter/broadcast")
async def broadcast_newsletter(body: dict, background_tasks: BackgroundTasks,
                                db: Session = Depends(get_db), _: User = Depends(require_admin)):
    subject = body.get("subject", "").strip()
    html_content = body.get("content", "").strip()
    audience = body.get("audience", "all")  # all | subscribers | freebie | users
    if not subject or not html_content:
        raise HTTPException(400, "Subject and content are required")
    
    emails = set()
    if audience in ("all", "subscribers"):
        subs = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.is_confirmed == True).all()
        for s in subs: emails.add((s.email, s.full_name or "Subscriber"))
    if audience in ("all", "freebie"):
        downloads = db.query(FreebieDownload).filter(FreebieDownload.is_confirmed == True).all()
        for d in downloads: emails.add((d.email, d.full_name or "Friend"))
    if audience in ("all", "users"):
        users = db.query(User).filter(User.is_active == True).all()
        for u in users: emails.add((u.email, u.full_name or "User"))
    
    if not emails:
        raise HTTPException(400, "No recipients found for selected audience")
    
    def send_broadcast():
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        sent = 0
        for email, name in emails:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = f"MyWorkSpace <{settings.FROM_EMAIL}>"
                msg["To"] = email
                # Use a HMAC-signed token so anyone knowing only the email address
                # cannot unsubscribe someone else (IDOR prevention).
                import hmac, hashlib
                unsub_token = hmac.new(
                    settings.SECRET_KEY.encode(), email.encode(), hashlib.sha256
                ).hexdigest()
                unsubscribe_url = f"{settings.APP_URL}/api/newsletter/unsubscribe?token={unsub_token}&email={email}"
                full_html = f"""
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#020c18;color:#e2e8f0;border-radius:12px;">
  <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid rgba(0,168,98,0.3);">
    <h2 style="color:#00a862;margin:0;">MyWorkSpace</h2>
  </div>
  {html_content}
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);font-size:12px;color:#64748b;">
    You received this because you subscribed or downloaded from MyWorkSpace.<br>
    <a href="{unsubscribe_url}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a>
  </div>
</div>"""
                msg.attach(MIMEText(full_html, "html"))
                with smtplib.SMTP(settings.SMTP_HOST, int(settings.SMTP_PORT)) as server:
                    server.ehlo()
                    server.starttls()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.send_message(msg)
                sent += 1
            except Exception as e:
                print(f"[BROADCAST ERROR] {email}: {e}")
        print(f"[BROADCAST] Sent {sent}/{len(emails)} emails")
    
    background_tasks.add_task(send_broadcast)
    return {"success": True, "recipient_count": len(emails), "message": f"Sending to {len(emails)} recipients in background"}

# ─── NOTIFICATIONS ────────────────────────────────────────────────
@router.get("/notifications")
def get_notifications(db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_active_user)):
    notifs = db.query(Notification)\
               .filter(Notification.user_id == current_user.id)\
               .order_by(Notification.created_at.desc())\
               .limit(30).all()
    return [{"id": n.id, "title": n.title, "message": n.message,
             "is_read": n.is_read, "link": n.link, "created_at": str(n.created_at)}
            for n in notifs]

@router.post("/notifications/{id}/read")
def mark_notification_read(id: int, db: Session = Depends(get_db),
                            current_user: User = Depends(get_current_active_user)):
    n = db.query(Notification).filter(Notification.id == id,
                                      Notification.user_id == current_user.id).first()
    if n:
        n.is_read = True
        db.commit()
    return {"success": True}

@router.post("/notifications/read-all")
def mark_all_read(db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_active_user)):
    db.query(Notification)\
      .filter(Notification.user_id == current_user.id, Notification.is_read == False)\
      .update({"is_read": True})
    db.commit()
    return {"success": True}

# ─── ABOUT ME ────────────────────────────────────────────────────
@router.get("/about")
def get_about(db: Session = Depends(get_db)):
    about = db.query(AboutMe).first()
    if not about:
        return {"name": "Tunji Ologun", "title": "AI/ML Engineer & Full Stack Developer",
                "bio_paragraphs": [], "photo_url": "", "topics": [], "social_links": {}}
    return {"id": about.id, "name": about.name, "title": about.title,
            "bio_paragraphs": json.loads(about.bio_paragraphs) if about.bio_paragraphs else [],
            "photo_url": about.photo_url,
            "topics": json.loads(about.topics) if about.topics else [],
            "social_links": json.loads(about.social_links) if about.social_links else {},
            "cv_url": about.cv_url}

@router.put("/admin/about")
async def update_about(
    name: str = Form(...), title: str = Form(...), bio_paragraphs: str = Form("[]"),
    topics: str = Form("[]"), social_links: str = Form("{}"),
    photo: Optional[UploadFile] = File(None),
    cv: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    about = db.query(AboutMe).first()
    if not about:
        about = AboutMe()
        db.add(about)
    about.name = name; about.title = title; about.bio_paragraphs = bio_paragraphs
    about.topics = topics; about.social_links = social_links
    if photo:
        about.photo_url = save_upload(photo, "about")
    if cv:
        about.cv_url = save_upload(cv, "about")
    db.commit()
    return {"success": True}

# ─── RBAC: ADMIN USER MANAGEMENT ─────────────────────────────────
@router.get("/admin/users")
def get_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    users = db.query(User).all()
    return [{"id": u.id, "full_name": u.full_name, "email": u.email,
             "role": u.role, "is_active": u.is_active, "created_at": str(u.created_at)}
            for u in users]

@router.put("/admin/users/{id}/role")
def update_user_role(
    id: int, role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin/Superuser can upgrade users to: moderator, instructor, admin.
    Only superuser can assign the 'superuser' role or demote another admin.
    """
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(404, "User not found")

    valid_roles = ["guest", "moderator", "instructor", "admin", "superuser"]
    if role not in valid_roles:
        raise HTTPException(400, f"Invalid role. Must be one of: {', '.join(valid_roles)}")

    # Only superuser can assign superuser role
    if role == "superuser" and current_user.role != "superuser":
        raise HTTPException(403, "Only a superuser can assign the superuser role.")

    # Only superuser can demote/change another admin
    if user.role in ["admin", "superuser"] and current_user.role != "superuser":
        raise HTTPException(403, "Only a superuser can change the role of an admin.")

    old_role = user.role
    user.role = role
    db.commit()

    # Send in-app notification to the user about their role change
    role_labels = {
        "moderator": "Moderator 🛡️",
        "instructor": "Instructor 🎓",
        "admin": "Administrator ⚙️",
        "superuser": "Super User 👑",
        "guest": "Guest"
    }
    notif = Notification(
        user_id=user.id,
        title="Your role has been updated",
        message=f"Your account role has been upgraded to {role_labels.get(role, role)} "
                f"by {current_user.full_name}. You now have access to additional features.",
        link="/admin" if role in ["admin", "superuser", "moderator", "instructor"] else "/"
    )
    db.add(notif)
    db.commit()

    # Also send email notification
    try:
        send_email(
            to_email=user.email,
            subject=f"MyWorkSpace — Your role has been updated to {role_labels.get(role, role)}",
            html_body=f"""
            <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:32px;background:#020c18;color:#e2e8f0;border-radius:12px;">
              <h2 style="color:#00a862;">Role Update 🎉</h2>
              <p>Hello <strong>{user.full_name}</strong>,</p>
              <p>Your MyWorkSpace account role has been updated:</p>
              <p style="font-size:18px;color:#00a862;font-weight:bold;">{role_labels.get(role, role)}</p>
              <p>You now have access to the dashboard and additional features. Log in to explore.</p>
              <a href="{settings.APP_URL}/login" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#00a862;color:#000;font-weight:bold;border-radius:8px;text-decoration:none;">
                Go to Dashboard
              </a>
            </div>
            """
        )
    except Exception:
        pass  # Don't fail the request if email fails

    return {"success": True, "user": {"id": user.id, "role": role, "full_name": user.full_name}}

@router.put("/admin/users/{id}/toggle-active")
def toggle_user_active(id: int, db: Session = Depends(get_db),
                       current_user: User = Depends(require_admin)):
    if id == current_user.id:
        raise HTTPException(400, "You cannot deactivate your own account.")
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"success": True, "is_active": user.is_active}

# ─── ADMIN STATS ─────────────────────────────────────────────────
@router.get("/admin/stats")
def get_stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return {
        "users": db.query(User).count(),
        "projects": db.query(Project).count(),
        "tutorials": db.query(Tutorial).count(),
        "products": db.query(Product).count(),
        "orders": db.query(Order).filter(Order.status == "paid").count(),
        "freebies": db.query(Freebie).count(),
        "contacts": db.query(ContactMessage).filter(ContactMessage.is_read == False).count(),
        "appointments": db.query(Appointment).filter(Appointment.status == "pending").count(),
        "newsletter_subscribers": db.query(NewsletterSubscriber).filter(
            NewsletterSubscriber.is_confirmed == True).count(),
        "unread_notifications": db.query(Notification).filter(Notification.is_read == False).count(),
        "freebie_downloads": sum(f.downloads or 0 for f in db.query(Freebie).all()),
    }

# ─── BACKGROUND TASK: notify newsletter subscribers ───────────────
def _notify_subscribers_new_tutorial(tutorial_id: int, db: Session):
    from app.models.user import FAQ, BotSettings, Tutorial as TutorialModel
    t = db.query(TutorialModel).filter(TutorialModel.id == tutorial_id).first()
    if not t:
        return
    confirmed_subs = db.query(NewsletterSubscriber)\
                       .filter(NewsletterSubscriber.is_confirmed == True).all()
    tutorial_url = f"{settings.APP_URL}/tutorials/{t.slug}"
    for sub in confirmed_subs:
        try:
            send_email(
                to_email=sub.email,
                subject=f"📚 New Tutorial: {t.title} — MyWorkSpace",
                html_body=f"""
                <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#020c18;color:#e2e8f0;border-radius:12px;">
                  <h2 style="color:#00a862;">New Tutorial Published 🚀</h2>
                  <h3 style="color:#fff;">{t.title}</h3>
                  <p style="color:#94a3b8;">{t.summary or ''}</p>
                  <a href="{tutorial_url}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#00a862;color:#000;font-weight:bold;border-radius:8px;text-decoration:none;">
                    Read Tutorial →
                  </a>
                  <hr style="border-color:#1e293b;margin:24px 0;">
                  <p style="font-size:11px;color:#475569;">
                    You're receiving this because you subscribed at myworkspace.com.<br>
                  </p>
                </div>
                """
            )
        except Exception:
            pass


# ══════════════════════════════════════════════════════════════════
#  CERTIFICATIONS
# ══════════════════════════════════════════════════════════════════
@router.get("/certifications")
def get_certifications(db: Session = Depends(get_db)):
    return [{"id": c.id, "name": c.name, "image_url": c.image_url, "cert_url": c.cert_url, "order_index": c.order_index}
            for c in db.query(Certification).filter(Certification.is_active==True).order_by(Certification.order_index).all()]

@router.post("/admin/certifications")
async def create_certification(name: str = Form(...), order_index: int = Form(0),
    cert_url: str = Form(None), image: UploadFile = File(None),
    db: Session = Depends(get_db), _: User = Depends(require_admin)):
    c = Certification(name=name, order_index=order_index, cert_url=cert_url)
    if image: c.image_url = save_upload(image, "certifications")
    db.add(c); db.commit(); db.refresh(c)
    return {"id": c.id, "name": c.name, "image_url": c.image_url}

@router.put("/admin/certifications/{cid}")
async def update_certification(cid: int, name: str = Form(...), order_index: int = Form(0),
    cert_url: str = Form(None), image: UploadFile = File(None),
    db: Session = Depends(get_db), _: User = Depends(require_admin)):
    c = db.query(Certification).filter(Certification.id==cid).first()
    if not c: raise HTTPException(404, "Not found")
    c.name = name; c.order_index = order_index; c.cert_url = cert_url
    if image: c.image_url = save_upload(image, "certifications")
    db.commit(); db.refresh(c)
    return {"id": c.id, "name": c.name, "image_url": c.image_url}

@router.delete("/admin/certifications/{cid}")
def delete_certification(cid: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    c = db.query(Certification).filter(Certification.id==cid).first()
    if not c: raise HTTPException(404, "Not found")
    db.delete(c); db.commit(); return {"ok": True}


# ══════════════════════════════════════════════════════════════════
#  EDUCATION
# ══════════════════════════════════════════════════════════════════
@router.get("/education")
def get_education(db: Session = Depends(get_db)):
    return [{"id": e.id, "school_name": e.school_name, "degree": e.degree,
             "logo_url": e.logo_url, "order_index": e.order_index}
            for e in db.query(Education).filter(Education.is_active==True).order_by(Education.order_index).all()]

@router.post("/admin/education")
async def create_education(school_name: str = Form(...), degree: str = Form(...),
    order_index: int = Form(0), logo: UploadFile = File(None),
    db: Session = Depends(get_db), _: User = Depends(require_admin)):
    e = Education(school_name=school_name, degree=degree, order_index=order_index)
    if logo: e.logo_url = save_upload(logo, "education")
    db.add(e); db.commit(); db.refresh(e)
    return {"id": e.id, "school_name": e.school_name, "degree": e.degree, "logo_url": e.logo_url}

@router.put("/admin/education/{eid}")
async def update_education(eid: int, school_name: str = Form(...), degree: str = Form(...),
    order_index: int = Form(0), logo: UploadFile = File(None),
    db: Session = Depends(get_db), _: User = Depends(require_admin)):
    e = db.query(Education).filter(Education.id==eid).first()
    if not e: raise HTTPException(404, "Not found")
    e.school_name = school_name; e.degree = degree; e.order_index = order_index
    if logo: e.logo_url = save_upload(logo, "education")
    db.commit(); db.refresh(e)
    return {"id": e.id, "school_name": e.school_name, "degree": e.degree, "logo_url": e.logo_url}

@router.delete("/admin/education/{eid}")
def delete_education(eid: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    e = db.query(Education).filter(Education.id==eid).first()
    if not e: raise HTTPException(404, "Not found")
    db.delete(e); db.commit(); return {"ok": True}


# ══════════════════════════════════════════════════════════════════
#  CLIENTS / CLIENTELE
# ══════════════════════════════════════════════════════════════════
@router.get("/clients")
def get_clients(db: Session = Depends(get_db)):
    return [{"id": c.id, "name": c.name, "logo_url": c.logo_url, "order_index": c.order_index}
            for c in db.query(Client).filter(Client.is_active==True).order_by(Client.order_index).all()]

@router.post("/admin/clients")
async def create_client(name: str = Form(...), order_index: int = Form(0),
    logo: UploadFile = File(None), db: Session = Depends(get_db), _: User = Depends(require_admin)):
    c = Client(name=name, order_index=order_index)
    if logo: c.logo_url = save_upload(logo, "clients")
    db.add(c); db.commit(); db.refresh(c)
    return {"id": c.id, "name": c.name, "logo_url": c.logo_url}

@router.put("/admin/clients/{cid}")
async def update_client(cid: int, name: str = Form(...), order_index: int = Form(0),
    logo: UploadFile = File(None), db: Session = Depends(get_db), _: User = Depends(require_admin)):
    c = db.query(Client).filter(Client.id==cid).first()
    if not c: raise HTTPException(404, "Not found")
    c.name = name; c.order_index = order_index
    if logo: c.logo_url = save_upload(logo, "clients")
    db.commit(); db.refresh(c)
    return {"id": c.id, "name": c.name, "logo_url": c.logo_url}

@router.delete("/admin/clients/{cid}")
def delete_client(cid: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    c = db.query(Client).filter(Client.id==cid).first()
    if not c: raise HTTPException(404, "Not found")
    db.delete(c); db.commit(); return {"ok": True}

# ─── FAQ ROUTES ───────────────────────────────────────────────────
@router.get("/faqs")
def get_faqs(db: Session = Depends(get_db)):
    return [{"id": f.id, "question": f.question, "answer": f.answer, "order_index": f.order_index}
            for f in db.query(FAQ).filter(FAQ.is_active==True).order_by(FAQ.order_index).all()]

@router.get("/admin/faqs")
def get_all_faqs(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return [{"id": f.id, "question": f.question, "answer": f.answer, "order_index": f.order_index, "is_active": f.is_active}
            for f in db.query(FAQ).order_by(FAQ.order_index).all()]

@router.post("/admin/faqs")
def create_faq(question: str = Form(...), answer: str = Form(''), order_index: int = Form(0),
               db: Session = Depends(get_db), _: User = Depends(require_admin)):
    f = FAQ(question=question, answer=answer, order_index=order_index)
    db.add(f); db.commit(); db.refresh(f)
    return {"id": f.id, "question": f.question, "answer": f.answer}

@router.put("/admin/faqs/{fid}")
def update_faq(fid: int, question: str = Form(...), answer: str = Form(''), order_index: int = Form(0),
               db: Session = Depends(get_db), _: User = Depends(require_admin)):
    f = db.query(FAQ).filter(FAQ.id==fid).first()
    if not f: raise HTTPException(404, "Not found")
    f.question = question; f.answer = answer; f.order_index = order_index
    db.commit()
    return {"success": True}

@router.delete("/admin/faqs/{fid}")
def delete_faq(fid: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    f = db.query(FAQ).filter(FAQ.id==fid).first()
    if not f: raise HTTPException(404, "Not found")
    db.delete(f); db.commit()
    return {"success": True}

# ─── BOT SETTINGS ─────────────────────────────────────────────────
@router.get("/admin/bot-settings")
def get_bot_settings(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    s = db.query(BotSettings).first()
    return {"system_prompt": s.system_prompt if s else ""}

@router.put("/admin/bot-settings")
def update_bot_settings(system_prompt: str = Form(...),
                        db: Session = Depends(get_db), _: User = Depends(require_admin)):
    s = db.query(BotSettings).first()
    if not s:
        s = BotSettings(system_prompt=system_prompt)
        db.add(s)
    else:
        s.system_prompt = system_prompt
    db.commit()
    return {"success": True}

# ─── APPOINTMENTS: STATUS UPDATES, REMINDERS & DELETE ───────────────
# PATCH /admin/appointments/{aid}/status  — update status + send confirmation email
# Reminder emails are auto-scheduled (24 h and 2 h before) when confirmed.
class AppointmentStatusUpdate(BaseModel):
    status: str

@router.patch("/admin/appointments/{aid}/status")
async def update_appointment_status(
    aid: int,
    payload: AppointmentStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    status = payload.status
    a = db.query(Appointment).filter(Appointment.id == aid).first()
    if not a:
        raise HTTPException(404, "Not found")
    a.status = status
    db.commit()

    # Send confirmation email to client when status changes to confirmed
    if status == "confirmed":
        try:
            html = f"""
            <div style="font-family:sans-serif;background:#020c18;color:#e2e8f0;padding:30px;border-radius:12px;">
              <h2 style="color:#00a862;">✅ Appointment Confirmed!</h2>
              <p>Hi <strong>{a.full_name}</strong>,</p>
              <p>Your appointment with <strong>Tunji Ologun</strong> has been confirmed.</p>
              <table style="margin:20px 0;border-collapse:collapse;width:100%">
                <tr><td style="padding:8px;color:#94a3b8;">📅 Date</td><td style="padding:8px;color:#e2e8f0;font-weight:bold;">{a.preferred_date}</td></tr>
                <tr><td style="padding:8px;color:#94a3b8;">🕐 Time</td><td style="padding:8px;color:#e2e8f0;font-weight:bold;">{a.preferred_time}</td></tr>
                <tr><td style="padding:8px;color:#94a3b8;">💬 Message</td><td style="padding:8px;color:#e2e8f0;">{a.message}</td></tr>
              </table>
              <p style="color:#94a3b8;">You will receive reminders 24 hours and 2 hours before your appointment.</p>
              <p style="color:#94a3b8;">If you need to reschedule, please reply to this email.</p>
              <hr style="border-color:#1e3a5f;margin:20px 0"/>
              <p style="color:#00a862;font-weight:bold;">MyWorkSpace</p>
            </div>"""
            send_email(a.email, "✅ Appointment Confirmed — MyWorkSpace", html)
            # Also notify admin
            send_email(
                settings.ADMIN_EMAIL,
                f"✅ Appointment Confirmed: {a.full_name}",
                f"<p>You confirmed the appointment with <strong>{a.full_name}</strong> ({a.email}) on {a.preferred_date} at {a.preferred_time}.</p>"
            )
        except Exception as e:
            print(f"[EMAIL ERROR] confirmation: {e}")

    # Schedule reminders when confirmed
    if status == "confirmed" and a.preferred_date and a.preferred_time:
        try:
            import asyncio
            from app.core.config import settings as cfg
            asyncio.create_task(schedule_appointment_reminders(a.id, cfg.DATABASE_URL))
            print(f"[REMINDERS] Scheduled for appointment {a.id}")
        except Exception as e:
            print(f"[REMINDER SCHEDULE ERROR] {e}")

    return {"success": True, "status": status}


async def schedule_appointment_reminders(appointment_id: int, database_url: str):
    """Send reminder emails to client 24h and 2h before appointment."""
    import asyncio
    from datetime import datetime, timedelta
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models.user import Appointment
    
    try:
        engine = create_engine(database_url)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        a = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not a or not a.preferred_date or not a.preferred_time:
            db.close()
            return

        appt_dt = datetime.strptime(f"{a.preferred_date} {a.preferred_time}", "%Y-%m-%d %H:%M")
        now = datetime.now()

        for hours_before, label in [(24, "24 hours"), (2, "2 hours")]:
            reminder_time = appt_dt - timedelta(hours=hours_before)
            wait_seconds = (reminder_time - now).total_seconds()
            if wait_seconds > 0:
                await asyncio.sleep(wait_seconds)
                # Re-fetch to check if still confirmed
                a = db.query(Appointment).filter(Appointment.id == appointment_id).first()
                if not a or a.status == "cancelled":
                    break
                html = f"""
                <div style="font-family:sans-serif;background:#020c18;color:#e2e8f0;padding:30px;border-radius:12px;">
                  <h2 style="color:#00a862;">⏰ Appointment Reminder</h2>
                  <p>Hi <strong>{a.full_name}</strong>,</p>
                  <p>This is a reminder that your appointment with <strong>Tunji Ologun</strong> is in <strong>{label}</strong>.</p>
                  <table style="margin:20px 0;border-collapse:collapse;width:100%">
                    <tr><td style="padding:8px;color:#94a3b8;">📅 Date</td><td style="padding:8px;color:#e2e8f0;font-weight:bold;">{a.preferred_date}</td></tr>
                    <tr><td style="padding:8px;color:#94a3b8;">🕐 Time</td><td style="padding:8px;color:#e2e8f0;font-weight:bold;">{a.preferred_time}</td></tr>
                    <tr><td style="padding:8px;color:#94a3b8;">💬 Purpose</td><td style="padding:8px;color:#e2e8f0;">{a.message}</td></tr>
                  </table>
                  <p style="color:#94a3b8;">If you need to reschedule, please reply to this email.</p>
                  <hr style="border-color:#1e3a5f;margin:20px 0"/>
                  <p style="color:#00a862;font-weight:bold;">MyWorkSpace</p>
                </div>"""
                try:
                    send_email(a.email, f"⏰ Reminder: Appointment in {label} — MyWorkSpace", html)
                    # Also remind Tunji
                    send_email(
                        settings.ADMIN_EMAIL,
                        f"⏰ Reminder: Appointment with {a.full_name} in {label}",
                        f"<p>You have an appointment with <strong>{a.full_name}</strong> ({a.email}) in <strong>{label}</strong>.</p><p>📅 {a.preferred_date} 🕐 {a.preferred_time}</p><p>Purpose: {a.message}</p>"
                    )
                    print(f"[REMINDER] Sent {label} reminder for appointment {appointment_id}")
                except Exception as e:
                    print(f"[REMINDER EMAIL ERROR] {e}")
        db.close()
    except Exception as e:
        print(f"[REMINDER ERROR] {e}")

@router.delete("/admin/appointments/{aid}")
def delete_appointment(aid: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    a = db.query(Appointment).filter(Appointment.id==aid).first()
    if not a: raise HTTPException(404, "Not found")
    db.delete(a); db.commit()
    return {"success": True}

# ─── BLOCKED SLOTS (booked appointments) ──────────────────────────
@router.get("/blocked-slots")
def get_blocked_slots(db: Session = Depends(get_db)):
    """Return only active (pending/confirmed) booked slots so contact form can avoid them.
    Cancelled and completed appointments are excluded."""
    appts = db.query(Appointment).filter(
        Appointment.preferred_date != None,
        Appointment.preferred_time != None,
        Appointment.status.in_(["pending", "confirmed"]),
    ).all()
    return [{"date": a.preferred_date, "time": a.preferred_time}
            for a in appts if a.preferred_date]

# ─── NEWSLETTER UNSUBSCRIBE ────────────────────────────────────────
@router.get("/newsletter/unsubscribe")
def newsletter_unsubscribe(email: str, token: str, db: Session = Depends(get_db)):
    """Token-verified unsubscribe — token is HMAC-SHA256(SECRET_KEY, email).
    Prevents IDOR: knowing only an email address cannot unsubscribe someone else."""
    import hmac, hashlib
    expected = hmac.new(
        settings.SECRET_KEY.encode(), email.encode(), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, token):
        raise HTTPException(400, "Invalid unsubscribe link.")
    sub = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == email).first()
    if sub:
        sub.is_confirmed = False
        db.commit()
    return RedirectResponse(url=f"{settings.APP_URL}/?unsubscribed=1")
