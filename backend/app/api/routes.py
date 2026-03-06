from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional, List
import json, os, shutil, uuid, stripe, markdown
from datetime import timedelta

from app.core.database import get_db
from app.core.config import settings
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    get_current_active_user, require_admin, require_instructor, get_optional_user
)
from app.models.user import (
    User, UserRole, Project, Tutorial, Comment, Like, Product, Order, OrderItem,
    Freebie, FreebieDownload, Appointment, ContactMessage, SiteSettings, AboutMe
)
from app.services.rag_service import chat_with_rag, send_freebie_email, send_purchase_email
from pydantic import BaseModel, EmailStr

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter()

# ============ UTILS ============
def save_upload(file: UploadFile, folder: str) -> str:
    os.makedirs(f"{settings.UPLOAD_DIR}/{folder}", exist_ok=True)
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    filename = f"{uuid.uuid4()}.{ext}"
    path = f"{settings.UPLOAD_DIR}/{folder}/{filename}"
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return f"/uploads/{folder}/{filename}"

# ============ AUTH ============
class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

@router.post("/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        full_name=req.full_name,
        email=req.email,
        phone=req.phone,
        hashed_password=get_password_hash(req.password),
        role=UserRole.guest
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "email": user.email, "role": user.role, "full_name": user.full_name}}

@router.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "email": user.email, "role": user.role, "full_name": user.full_name, "avatar_url": user.avatar_url}}

@router.get("/auth/me")
def get_me(current_user: User = Depends(get_current_active_user)):
    return {"id": current_user.id, "email": current_user.email, "role": current_user.role, "full_name": current_user.full_name, "avatar_url": current_user.avatar_url}

# ============ CHAT ============
class ChatMessage(BaseModel):
    message: str
    history: List[dict] = []

@router.post("/chat")
async def chat(req: ChatMessage, db: Session = Depends(get_db)):
    result = await chat_with_rag(req.message, req.history, db)
    return result

# ============ PROJECTS ============
@router.get("/projects")
def get_projects(category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Project)
    if category:
        q = q.filter(Project.category == category)
    projects = q.order_by(Project.order_index).all()
    return [{"id": p.id, "title": p.title, "slug": p.slug, "category": p.category, "summary": p.summary, "description": p.description, "image_url": p.image_url, "tech_stack": json.loads(p.tech_stack) if p.tech_stack else [], "github_url": p.github_url, "live_url": p.live_url, "is_featured": p.is_featured} for p in projects]

@router.get("/projects/{slug}")
def get_project(slug: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.slug == slug).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"id": p.id, "title": p.title, "slug": p.slug, "category": p.category, "summary": p.summary, "description": p.description, "image_url": p.image_url, "tech_stack": json.loads(p.tech_stack) if p.tech_stack else [], "github_url": p.github_url, "live_url": p.live_url}

@router.post("/admin/projects")
async def create_project(
    title: str = Form(...), category: str = Form(...), summary: str = Form(...),
    description: str = Form(""), tech_stack: str = Form("[]"),
    github_url: str = Form(""), live_url: str = Form(""),
    is_featured: bool = Form(False), order_index: int = Form(0),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), _: User = Depends(require_instructor)
):
    slug = title.lower().replace(" ", "-").replace("/", "-")[:100]
    image_url = save_upload(image, "projects") if image else ""
    p = Project(title=title, slug=slug, category=category, summary=summary, description=description, tech_stack=tech_stack, github_url=github_url, live_url=live_url, is_featured=is_featured, order_index=order_index, image_url=image_url)
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "slug": p.slug}

@router.put("/admin/projects/{id}")
async def update_project(
    id: int, title: str = Form(...), category: str = Form(...), summary: str = Form(...),
    description: str = Form(""), tech_stack: str = Form("[]"),
    github_url: str = Form(""), live_url: str = Form(""),
    is_featured: bool = Form(False), order_index: int = Form(0),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), _: User = Depends(require_instructor)
):
    p = db.query(Project).filter(Project.id == id).first()
    if not p:
        raise HTTPException(404, "Not found")
    p.title = title; p.category = category; p.summary = summary
    p.description = description; p.tech_stack = tech_stack
    p.github_url = github_url; p.live_url = live_url
    p.is_featured = is_featured; p.order_index = order_index
    if image:
        p.image_url = save_upload(image, "projects")
    db.commit()
    return {"success": True}

@router.delete("/admin/projects/{id}")
def delete_project(id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    p = db.query(Project).filter(Project.id == id).first()
    if p:
        db.delete(p)
        db.commit()
    return {"success": True}

# ============ TUTORIALS ============
@router.get("/tutorials")
def get_tutorials(category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Tutorial).filter(Tutorial.is_published == True)
    if category:
        q = q.filter(Tutorial.category == category)
    tutorials = q.order_by(Tutorial.created_at.desc()).all()
    return [{"id": t.id, "title": t.title, "slug": t.slug, "summary": t.summary, "image_url": t.image_url, "video_url": t.video_url, "category": t.category, "views": t.views, "created_at": str(t.created_at), "author": t.author.full_name if t.author else "Admin", "likes_count": len(t.likes), "comments_count": len(t.comments)} for t in tutorials]

@router.get("/tutorials/{slug}")
def get_tutorial(slug: str, db: Session = Depends(get_db)):
    t = db.query(Tutorial).filter(Tutorial.slug == slug, Tutorial.is_published == True).first()
    if not t:
        raise HTTPException(404, "Not found")
    t.views = (t.views or 0) + 1
    db.commit()
    html_content = markdown.markdown(t.content or "", extensions=["fenced_code", "codehilite", "tables"])
    return {"id": t.id, "title": t.title, "slug": t.slug, "content": t.content, "content_html": html_content, "summary": t.summary, "image_url": t.image_url, "video_url": t.video_url, "category": t.category, "views": t.views, "created_at": str(t.created_at), "author": t.author.full_name if t.author else "Admin", "likes_count": len(t.likes), "comments": [{"id": c.id, "content": c.content, "user": c.user.full_name, "created_at": str(c.created_at)} for c in t.comments]}

@router.post("/admin/tutorials")
async def create_tutorial(
    title: str = Form(...), content: str = Form(...), summary: str = Form(""),
    category: str = Form("general"), video_url: str = Form(""), is_published: bool = Form(False),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), current_user: User = Depends(require_instructor)
):
    slug = title.lower().replace(" ", "-")[:100] + f"-{uuid.uuid4().hex[:6]}"
    image_url = save_upload(image, "tutorials") if image else ""
    t = Tutorial(title=title, slug=slug, content=content, summary=summary, category=category, video_url=video_url, is_published=is_published, author_id=current_user.id, image_url=image_url)
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"id": t.id, "slug": t.slug}

@router.put("/admin/tutorials/{id}")
async def update_tutorial(
    id: int, title: str = Form(...), content: str = Form(...), summary: str = Form(""),
    category: str = Form("general"), video_url: str = Form(""), is_published: bool = Form(False),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), _: User = Depends(require_instructor)
):
    t = db.query(Tutorial).filter(Tutorial.id == id).first()
    if not t:
        raise HTTPException(404, "Not found")
    t.title = title; t.content = content; t.summary = summary
    t.category = category; t.video_url = video_url; t.is_published = is_published
    if image:
        t.image_url = save_upload(image, "tutorials")
    db.commit()
    return {"success": True}

@router.delete("/admin/tutorials/{id}")
def delete_tutorial(id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    t = db.query(Tutorial).filter(Tutorial.id == id).first()
    if t:
        db.delete(t)
        db.commit()
    return {"success": True}

@router.post("/tutorials/{id}/comment")
def add_comment(id: int, content: str = Form(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    c = Comment(content=content, user_id=current_user.id, tutorial_id=id)
    db.add(c)
    db.commit()
    return {"success": True}

@router.post("/tutorials/{id}/like")
def toggle_like(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    existing = db.query(Like).filter(Like.user_id == current_user.id, Like.tutorial_id == id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"liked": False}
    like = Like(user_id=current_user.id, tutorial_id=id)
    db.add(like)
    db.commit()
    return {"liked": True}

# ============ PRODUCTS / SHOP ============
@router.get("/products")
def get_products(category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Product).filter(Product.is_active == True)
    if category:
        q = q.filter(Product.category == category)
    products = q.all()
    return [{"id": p.id, "title": p.title, "slug": p.slug, "description": p.description, "price": p.price, "image_url": p.image_url, "category": p.category, "downloads": p.downloads} for p in products]

@router.get("/products/{slug}")
def get_product(slug: str, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.slug == slug, Product.is_active == True).first()
    if not p:
        raise HTTPException(404, "Not found")
    return {"id": p.id, "title": p.title, "slug": p.slug, "description": p.description, "price": p.price, "image_url": p.image_url, "category": p.category}

@router.post("/shop/checkout")
async def create_checkout(product_ids: List[int], customer_email: str, customer_name: str, db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.id.in_(product_ids), Product.is_active == True).all()
    if not products:
        raise HTTPException(400, "No valid products")
    line_items = [{"price_data": {"currency": "usd", "product_data": {"name": p.title}, "unit_amount": int(p.price * 100)}, "quantity": 1} for p in products]
    order = Order(customer_email=customer_email, customer_name=customer_name, total_amount=sum(p.price for p in products), status="pending")
    db.add(order)
    db.commit()
    db.refresh(order)
    for p in products:
        item = OrderItem(order_id=order.id, product_id=p.id, price=p.price)
        db.add(item)
    db.commit()
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=line_items,
        mode="payment",
        customer_email=customer_email,
        success_url=f"{settings.APP_URL}/shop/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.APP_URL}/shop",
        metadata={"order_id": str(order.id), "customer_name": customer_name}
    )
    order.stripe_session_id = session.id
    db.commit()
    return {"checkout_url": session.url, "session_id": session.id}

@router.post("/shop/webhook")
async def stripe_webhook(request_body: bytes, stripe_signature: str, db: Session = Depends(get_db)):
    from fastapi import Request
    try:
        event = stripe.Webhook.construct_event(request_body, stripe_signature, settings.STRIPE_WEBHOOK_SECRET)
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
            download_urls = [f"{settings.BACKEND_URL}/uploads/products/{p.file_name}" for p in products if p and p.file_name]
            product_list = [{"title": p.title} for p in products if p]
            send_purchase_email(order.customer_email, order.customer_name, product_list, download_urls)
    return {"received": True}

@router.post("/admin/products")
async def create_product(
    title: str = Form(...), description: str = Form(""), price: float = Form(...),
    category: str = Form("ebook"),
    image: Optional[UploadFile] = File(None),
    digital_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), _: User = Depends(require_instructor)
):
    slug = title.lower().replace(" ", "-")[:100] + f"-{uuid.uuid4().hex[:6]}"
    image_url = save_upload(image, "product_images") if image else ""
    file_url = ""
    file_name = ""
    if digital_file:
        file_url = save_upload(digital_file, "products")
        file_name = digital_file.filename
    p = Product(title=title, slug=slug, description=description, price=price, category=category, image_url=image_url, file_url=file_url, file_name=file_name)
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
    db: Session = Depends(get_db), _: User = Depends(require_instructor)
):
    p = db.query(Product).filter(Product.id == id).first()
    if not p:
        raise HTTPException(404, "Not found")
    p.title = title; p.description = description; p.price = price; p.category = category; p.is_active = is_active
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

# ============ FREEBIES ============
@router.get("/freebies")
def get_freebies(db: Session = Depends(get_db)):
    freebies = db.query(Freebie).filter(Freebie.is_active == True).all()
    return [{"id": f.id, "title": f.title, "description": f.description, "image_url": f.image_url, "category": f.category, "downloads": f.downloads} for f in freebies]

class FreebieDownloadRequest(BaseModel):
    freebie_id: int
    full_name: str
    email: EmailStr

@router.post("/freebies/download")
async def request_freebie(req: FreebieDownloadRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    freebie = db.query(Freebie).filter(Freebie.id == req.freebie_id, Freebie.is_active == True).first()
    if not freebie:
        raise HTTPException(404, "Freebie not found")
    record = FreebieDownload(freebie_id=req.freebie_id, email=req.email, full_name=req.full_name)
    db.add(record)
    freebie.downloads = (freebie.downloads or 0) + 1
    db.commit()
    download_url = f"{settings.BACKEND_URL}{freebie.file_url}"
    background_tasks.add_task(send_freebie_email, req.email, req.full_name, freebie.title, download_url)
    return {"download_url": download_url, "message": "Download link sent to your email!"}

@router.post("/admin/freebies")
async def create_freebie(
    title: str = Form(...), description: str = Form(""), category: str = Form("ebook"),
    image: Optional[UploadFile] = File(None),
    digital_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), _: User = Depends(require_instructor)
):
    image_url = save_upload(image, "freebie_images") if image else ""
    file_url = save_upload(digital_file, "freebies") if digital_file else ""
    file_name = digital_file.filename if digital_file else ""
    f = Freebie(title=title, description=description, category=category, image_url=image_url, file_url=file_url, file_name=file_name)
    db.add(f)
    db.commit()
    db.refresh(f)
    return {"id": f.id}

@router.delete("/admin/freebies/{id}")
def delete_freebie(id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    f = db.query(Freebie).filter(Freebie.id == id).first()
    if f:
        db.delete(f)
        db.commit()
    return {"success": True}

# ============ CONTACT ============
class ContactRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str

@router.post("/contact")
def submit_contact(req: ContactRequest, db: Session = Depends(get_db)):
    msg = ContactMessage(full_name=req.full_name, email=req.email, phone=req.phone, message=req.message)
    db.add(msg)
    db.commit()
    return {"success": True, "message": "Message sent successfully!"}

@router.get("/admin/contacts")
def get_contacts(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    msgs = db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).all()
    return [{"id": m.id, "full_name": m.full_name, "email": m.email, "phone": m.phone, "message": m.message, "is_read": m.is_read, "created_at": str(m.created_at)} for m in msgs]

@router.get("/admin/appointments")
def get_appointments(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    appts = db.query(Appointment).order_by(Appointment.created_at.desc()).all()
    return [{"id": a.id, "full_name": a.full_name, "email": a.email, "phone": a.phone, "message": a.message, "preferred_date": a.preferred_date, "status": a.status, "created_at": str(a.created_at)} for a in appts]

# ============ ABOUT ME ============
@router.get("/about")
def get_about(db: Session = Depends(get_db)):
    about = db.query(AboutMe).first()
    if not about:
        return {"name": "Tunji Ologun", "title": "AI/ML Engineer & Full Stack Developer", "bio_paragraphs": [], "photo_url": "", "topics": [], "social_links": {}}
    return {"id": about.id, "name": about.name, "title": about.title, "bio_paragraphs": json.loads(about.bio_paragraphs) if about.bio_paragraphs else [], "photo_url": about.photo_url, "topics": json.loads(about.topics) if about.topics else [], "social_links": json.loads(about.social_links) if about.social_links else {}}

@router.put("/admin/about")
async def update_about(
    name: str = Form(...), title: str = Form(...), bio_paragraphs: str = Form("[]"),
    topics: str = Form("[]"), social_links: str = Form("{}"),
    photo: Optional[UploadFile] = File(None),
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
    db.commit()
    return {"success": True}

# ============ ADMIN USERS ============
@router.get("/admin/users")
def get_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    users = db.query(User).all()
    return [{"id": u.id, "full_name": u.full_name, "email": u.email, "role": u.role, "is_active": u.is_active, "created_at": str(u.created_at)} for u in users]

@router.put("/admin/users/{id}/role")
def update_user_role(id: int, role: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(404, "Not found")
    user.role = role
    db.commit()
    return {"success": True}

# ============ ADMIN STATS ============
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
    }
