from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class UserRole(str, enum.Enum):
    admin = "admin"
    instructor = "instructor"
    guest = "guest"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200))
    email = Column(String(200), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    hashed_password = Column(String(500))
    role = Column(SAEnum(UserRole), default=UserRole.guest)
    is_active = Column(Boolean, default=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    comments = relationship("Comment", back_populates="user")
    likes = relationship("Like", back_populates="user")
    orders = relationship("Order", back_populates="user")

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    slug = Column(String(300), unique=True, index=True)
    category = Column(String(100))  # ai_ml, data_analysis, ai_automations, fullstack
    summary = Column(Text)
    description = Column(Text)
    image_url = Column(String(500))
    tech_stack = Column(Text)  # JSON string
    github_url = Column(String(500), nullable=True)
    live_url = Column(String(500), nullable=True)
    is_featured = Column(Boolean, default=False)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Tutorial(Base):
    __tablename__ = "tutorials"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    slug = Column(String(300), unique=True, index=True)
    content = Column(Text)  # Markdown
    summary = Column(Text)
    image_url = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)
    category = Column(String(100))
    is_published = Column(Boolean, default=False)
    author_id = Column(Integer, ForeignKey("users.id"))
    author = relationship("User")
    views = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    comments = relationship("Comment", back_populates="tutorial")
    likes = relationship("Like", back_populates="tutorial")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    tutorial_id = Column(Integer, ForeignKey("tutorials.id"))
    user = relationship("User", back_populates="comments")
    tutorial = relationship("Tutorial", back_populates="comments")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Like(Base):
    __tablename__ = "likes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    tutorial_id = Column(Integer, ForeignKey("tutorials.id"))
    user = relationship("User", back_populates="likes")
    tutorial = relationship("Tutorial", back_populates="likes")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    slug = Column(String(300), unique=True, index=True)
    description = Column(Text)
    price = Column(Float, nullable=False)
    image_url = Column(String(500))
    file_url = Column(String(500))  # Digital file path
    file_name = Column(String(300))
    category = Column(String(100))  # ebook, source_code, template
    is_active = Column(Boolean, default=True)
    stripe_price_id = Column(String(200), nullable=True)
    stripe_product_id = Column(String(200), nullable=True)
    downloads = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    order_items = relationship("OrderItem", back_populates="product")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    customer_email = Column(String(200), nullable=False)
    customer_name = Column(String(200))
    stripe_session_id = Column(String(500))
    stripe_payment_intent = Column(String(500), nullable=True)
    status = Column(String(50), default="pending")  # pending, paid, failed
    total_amount = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    price = Column(Float)
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

class Freebie(Base):
    __tablename__ = "freebies"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text)
    image_url = Column(String(500))
    file_url = Column(String(500))
    file_name = Column(String(300))
    category = Column(String(100))
    is_active = Column(Boolean, default=True)
    downloads = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class FreebieDownload(Base):
    __tablename__ = "freebie_downloads"
    id = Column(Integer, primary_key=True, index=True)
    freebie_id = Column(Integer, ForeignKey("freebies.id"))
    email = Column(String(200))
    full_name = Column(String(200))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200))
    email = Column(String(200))
    phone = Column(String(50), nullable=True)
    message = Column(Text)
    preferred_date = Column(String(100), nullable=True)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ContactMessage(Base):
    __tablename__ = "contact_messages"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200))
    email = Column(String(200))
    phone = Column(String(50), nullable=True)
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SiteSettings(Base):
    __tablename__ = "site_settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(200), unique=True)
    value = Column(Text)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class AboutMe(Base):
    __tablename__ = "about_me"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200))
    title = Column(String(200))
    bio_paragraphs = Column(Text)  # JSON array of paragraphs
    photo_url = Column(String(500))
    topics = Column(Text)  # JSON array
    social_links = Column(Text)  # JSON object
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
