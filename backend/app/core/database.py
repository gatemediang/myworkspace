from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import time


def _build_engine_kwargs(url: str) -> dict:
    """
    Return extra kwargs for create_engine based on the database URL.
    - SQLite: disable same-thread check
    - PostgreSQL + REQUIRE_SSL=true: add sslmode=require (needed for Railway)
    """
    if url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    if settings.REQUIRE_SSL and "sslmode" not in url:
        return {"connect_args": {"sslmode": "require"}}
    return {}


def create_engine_with_retry(url, retries=10, delay=3):
    kwargs = _build_engine_kwargs(url)
    for i in range(retries):
        try:
            e = create_engine(url, pool_pre_ping=True, **kwargs)
            with e.connect() as conn:
                conn.execute(text("SELECT 1"))
            print(f"✅ Database connected on attempt {i+1}")
            return e
        except Exception as ex:
            print(f"⏳ DB not ready (attempt {i+1}/{retries}): {ex}")
            time.sleep(delay)
    raise RuntimeError("Could not connect to database after retries")


engine = create_engine_with_retry(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
