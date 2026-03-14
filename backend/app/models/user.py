from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    superuser  = "superuser"    # ← highest level, can promote others
    admin      = "admin"
    moderator  = "moderator"    # ← NEW: can approve comments etc.
    instructor = "instructor"
    guest      = "guest"


class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    full_name       = Column(String(200))
    email           = Column(String(200), unique=True, index=True, nullable=False)
    phone           = Column(String(50), nullable=True)
    hashed_password = Column(String(500), nullable=True)   # nullable for OAuth users
    role            = Column(SAEnum(UserRole), default=UserRole.guest)
    is_active       = Column(Boolean, default=True)
    avatar_url      = Column(String(500), nullable=True)
    oauth_provider  = Column(String(50), nullable=True)    # 'google', 'github', or None
    oauth_id        = Column(String(200), nullable=True)
    email_confirmed     = Column(Boolean, default=False)
    confirm_token       = Column(String(200), nullable=True)
    reset_token         = Column(String(200), nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    comments        = relationship("Comment",  back_populates="user")
    likes           = relationship("Like",     back_populates="user")
    orders          = relationship("Order",    back_populates="user")
    notifications   = relationship("Notification", back_populates="user")


class Project(Base):
    __tablename__ = "projects"
    id              = Column(Integer, primary_key=True, index=True)
    title           = Column(String(300), nullable=False)
    slug            = Column(String(300), unique=True, index=True)
    category        = Column(String(100))
    summary         = Column(Text)           # 300-word description shown on card
    description     = Column(Text)           # unlimited — full project details page
    image_url       = Column(String(500))
    source_code_url = Column(String(500), nullable=True)   # uploaded source code file
    tech_stack      = Column(Text)           # JSON string
    github_url      = Column(String(500), nullable=True)
    live_url        = Column(String(500), nullable=True)
    is_featured     = Column(Boolean, default=False)
    order_index     = Column(Integer, default=0)
    publish_to_blog = Column(Boolean, default=False)
    notebook_url    = Column(String(500), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())


class Tutorial(Base):
    __tablename__ = "tutorials"
    id           = Column(Integer, primary_key=True, index=True)
    title        = Column(String(300), nullable=False)
    slug         = Column(String(300), unique=True, index=True)
    content      = Column(Text)          # Markdown
    summary      = Column(Text)
    image_url    = Column(String(500), nullable=True)
    video_url    = Column(String(500), nullable=True)
    category     = Column(String(100))
    is_published = Column(Boolean, default=False)
    author_id    = Column(Integer, ForeignKey("users.id"))
    author       = relationship("User")
    views        = Column(Integer, default=0)
    tech_stack   = Column(Text, nullable=True)
    github_url   = Column(String(500), nullable=True)
    live_url     = Column(String(500), nullable=True)
    notebook_url = Column(String(500), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())
    comments     = relationship("Comment", back_populates="tutorial")
    likes        = relationship("Like",    back_populates="tutorial")


# ─── Comment ──────────────────────────────────────────────────────
class Comment(Base):
    __tablename__ = "comments"
    id          = Column(Integer, primary_key=True, index=True)
    content     = Column(Text, nullable=False)
    user_id     = Column(Integer, ForeignKey("users.id"))
    tutorial_id = Column(Integer, ForeignKey("tutorials.id"))
    user        = relationship("User",     back_populates="comments")
    tutorial    = relationship("Tutorial", back_populates="comments")
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


# ─── Like ─────────────────────────────────────────────────────────
class Like(Base):
    __tablename__ = "likes"
    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"))
    tutorial_id = Column(Integer, ForeignKey("tutorials.id"))
    user        = relationship("User",     back_populates="likes")
    tutorial    = relationship("Tutorial", back_populates="likes")
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


# ─── Product (shop item) ──────────────────────────────────────────
class Product(Base):
    __tablename__ = "products"
    id                = Column(Integer, primary_key=True, index=True)
    title             = Column(String(300), nullable=False)
    slug              = Column(String(300), unique=True, index=True)
    description       = Column(Text)
    price             = Column(Float, nullable=False)
    image_url         = Column(String(500))
    file_url          = Column(String(500))
    file_name         = Column(String(300))
    category          = Column(String(100))
    is_active         = Column(Boolean, default=True)
    stripe_price_id   = Column(String(200), nullable=True)
    stripe_product_id = Column(String(200), nullable=True)
    downloads         = Column(Integer, default=0)
    live_url          = Column(String(500), nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    order_items       = relationship("OrderItem", back_populates="product")


# ─── Order & OrderItem (Stripe checkout records) ──────────────────
class Order(Base):
    __tablename__ = "orders"
    id                    = Column(Integer, primary_key=True, index=True)
    user_id               = Column(Integer, ForeignKey("users.id"), nullable=True)
    customer_email        = Column(String(200), nullable=False)
    customer_name         = Column(String(200))
    stripe_session_id     = Column(String(500))
    stripe_payment_intent = Column(String(500), nullable=True)
    status                = Column(String(50), default="pending")
    total_amount          = Column(Float)
    created_at            = Column(DateTime(timezone=True), server_default=func.now())
    user                  = relationship("User",      back_populates="orders")
    items                 = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"
    id         = Column(Integer, primary_key=True, index=True)
    order_id   = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    price      = Column(Float)
    order      = relationship("Order",   back_populates="items")
    product    = relationship("Product", back_populates="order_items")


# ─── Freebie & FreebieDownload (email-confirmed free downloads) ───
class Freebie(Base):
    __tablename__ = "freebies"
    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String(300), nullable=False)
    description = Column(Text)
    image_url   = Column(String(500))
    file_url    = Column(String(500))
    file_name   = Column(String(300))
    category    = Column(String(100))
    is_active   = Column(Boolean, default=True)
    downloads   = Column(Integer, default=0)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


class FreebieDownload(Base):
    __tablename__ = "freebie_downloads"
    id            = Column(Integer, primary_key=True, index=True)
    freebie_id    = Column(Integer, ForeignKey("freebies.id"))
    email         = Column(String(200))
    full_name     = Column(String(200))
    confirm_token = Column(String(200), nullable=True)
    is_confirmed  = Column(Boolean, default=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())


# ─── Appointment (booking via contact form or chatbot) ────────────
class Appointment(Base):
    __tablename__ = "appointments"
    id             = Column(Integer, primary_key=True, index=True)
    full_name      = Column(String(200))
    email          = Column(String(200))
    phone          = Column(String(50),  nullable=True)
    message        = Column(Text)
    preferred_date = Column(String(100), nullable=True)
    preferred_time = Column(String(50), nullable=True)
    status         = Column(String(50),  default="pending")
    created_at     = Column(DateTime(timezone=True), server_default=func.now())


# ─── ContactMessage (general contact form submission) ─────────────
class ContactMessage(Base):
    __tablename__ = "contact_messages"
    id         = Column(Integer, primary_key=True, index=True)
    full_name  = Column(String(200))
    email      = Column(String(200))
    phone      = Column(String(50), nullable=True)
    message    = Column(Text)
    is_read    = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    preferred_date = Column(String(100), nullable=True)
    preferred_time = Column(String(50),  nullable=True)


# ─── SiteSettings (key/value CMS settings store) ──────────────────
class SiteSettings(Base):
    __tablename__ = "site_settings"
    id         = Column(Integer, primary_key=True, index=True)
    key        = Column(String(200), unique=True)
    value      = Column(Text)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ─── AboutMe (single-row profile page content) ────────────────────
class AboutMe(Base):
    __tablename__ = "about_me"
    id             = Column(Integer, primary_key=True, index=True)
    name           = Column(String(200))
    title          = Column(String(200))
    bio_paragraphs = Column(Text)   # JSON array
    photo_url      = Column(String(500))
    topics         = Column(Text)   # JSON array
    social_links   = Column(Text)   # JSON object
    cv_url         = Column(String(500), nullable=True)
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())


# ─── NEW: Newsletter subscriber ───────────────────────────────────
class NewsletterSubscriber(Base):
    __tablename__ = "newsletter_subscribers"
    id                = Column(Integer, primary_key=True, index=True)
    full_name         = Column(String(200))
    email             = Column(String(200), unique=True, index=True)
    is_confirmed      = Column(Boolean, default=False)
    confirm_token     = Column(String(200), nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    confirmed_at      = Column(DateTime(timezone=True), nullable=True)


# ─── NEW: In-app notification for users ───────────────────────────
class Notification(Base):
    __tablename__ = "notifications"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"))
    title      = Column(String(300))
    message    = Column(Text)
    is_read    = Column(Boolean, default=False)
    link       = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user       = relationship("User", back_populates="notifications")


# ─── NEW: Hero image slider ────────────────────────────────────────
class HeroSlide(Base):
    __tablename__ = "hero_slides"
    id          = Column(Integer, primary_key=True, index=True)
    image_url   = Column(String(500), nullable=False)
    caption     = Column(String(300), nullable=True)
    subtitle    = Column(String(300), nullable=True)
    link_url    = Column(String(500), nullable=True)
    tutorial_id = Column(Integer, ForeignKey("tutorials.id"), nullable=True)
    order_index = Column(Integer, default=0)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    tutorial    = relationship("Tutorial")


# ─── Certification ────────────────────────────────────────────────
class Certification(Base):
    __tablename__ = "certifications"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(300), nullable=False)
    image_url   = Column(String(500), nullable=True)
    cert_url    = Column(String(500), nullable=True)
    order_index = Column(Integer, default=0)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


# ─── Education ────────────────────────────────────────────────────
class Education(Base):
    __tablename__ = "education"
    id           = Column(Integer, primary_key=True, index=True)
    school_name  = Column(String(300), nullable=False)
    degree       = Column(String(300), nullable=False)
    logo_url     = Column(String(500), nullable=True)
    order_index  = Column(Integer, default=0)
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())


# ─── Client / Clientele ───────────────────────────────────────────
class Client(Base):
    __tablename__ = "clients"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(300), nullable=False)
    logo_url    = Column(String(500), nullable=True)
    order_index = Column(Integer, default=0)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

# ─── FAQ & BotSettings (chatbot quick-replies and system prompt) ───
class FAQ(Base):
    __tablename__ = "faqs"
    id         = Column(Integer, primary_key=True, index=True)
    question   = Column(String(500), nullable=False)
    answer     = Column(Text, nullable=False)
    order_index= Column(Integer, default=0)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class BotSettings(Base):
    __tablename__ = "bot_settings"
    id         = Column(Integer, primary_key=True, index=True)
    system_prompt = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
