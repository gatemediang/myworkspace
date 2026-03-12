from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import smtplib, ssl, os, re
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole, NewsletterSubscriber, FreebieDownload

router = APIRouter()

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.admin, UserRole.superuser]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

class SubscribeIn(BaseModel):
    email: str
    full_name: Optional[str] = ""

@router.post("/newsletter/subscribe")
def subscribe(payload: SubscribeIn, db: Session = Depends(get_db)):
    existing = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == payload.email).first()
    if existing:
        return {"message": "Already subscribed" if existing.is_confirmed else "Please check your email to confirm"}
    import secrets
    db.add(NewsletterSubscriber(email=payload.email, full_name=payload.full_name,
        confirm_token=secrets.token_urlsafe(32), is_confirmed=False))
    db.commit()
    return {"message": "Subscribed! Check your email to confirm."}

@router.get("/newsletter/confirm/{token}")
def confirm_subscription(token: str, db: Session = Depends(get_db)):
    sub = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.confirm_token == token).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
    from datetime import datetime, timezone
    sub.is_confirmed = True
    sub.confirmed_at = datetime.now(timezone.utc)
    sub.confirm_token = None
    db.commit()
    return {"message": "Subscription confirmed! Thank you."}

@router.get("/admin/newsletter/subscribers")
def get_subscribers(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    subs = db.query(NewsletterSubscriber).order_by(NewsletterSubscriber.created_at.desc()).all()
    return [{"id": s.id, "email": s.email, "full_name": s.full_name,
             "is_confirmed": s.is_confirmed, "created_at": s.created_at,
             "confirmed_at": s.confirmed_at} for s in subs]

@router.get("/admin/freebies/downloads")
def get_freebie_downloads(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    downloads = db.query(FreebieDownload).order_by(FreebieDownload.created_at.desc()).all()
    return [{"id": d.id, "email": d.email, "full_name": d.full_name,
             "freebie_id": d.freebie_id, "is_confirmed": d.is_confirmed,
             "created_at": d.created_at} for d in downloads]

class BroadcastIn(BaseModel):
    subject: str
    content: str
    audience: str = "all"

def _build_recipients(audience: str, db: Session) -> List[dict]:
    emails: dict[str, str] = {}
    if audience in ("all", "subscribers"):
        for s in db.query(NewsletterSubscriber).filter(NewsletterSubscriber.is_confirmed == True).all():
            emails[s.email] = s.full_name or ""
    if audience in ("all", "freebie"):
        seen: set = set()
        for r in db.query(FreebieDownload).filter(FreebieDownload.is_confirmed == True).all():
            if r.email not in seen:
                seen.add(r.email)
                emails.setdefault(r.email, r.full_name or "")
    if audience in ("all", "users"):
        for u in db.query(User).filter(User.is_active == True).all():
            emails.setdefault(u.email, u.full_name or "")
    return [{"email": e, "name": n} for e, n in emails.items()]

def _send_smtp(to_email: str, subject: str, html_body: str):
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    from_email = os.getenv("FROM_EMAIL", smtp_user)
    from_name  = os.getenv("FROM_NAME", "MyWorkSpace")
    if not smtp_host or not smtp_user:
        print(f"[NEWSLETTER] SMTP not configured. Would send to: {to_email}")
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{from_name} <{from_email}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(re.sub(r"<[^>]+>", "", html_body), "plain"))
    msg.attach(MIMEText(html_body, "html"))
    ctx = ssl.create_default_context()
    with smtplib.SMTP(smtp_host, smtp_port) as s:
        s.starttls(context=ctx)
        s.login(smtp_user, smtp_pass)
        s.sendmail(from_email, to_email, msg.as_string())

def _broadcast_task(recipients: list, subject: str, content: str):
    sent = failed = 0
    for r in recipients:
        try:
            _send_smtp(r["email"], subject, content)
            sent += 1
        except Exception as e:
            print(f"[NEWSLETTER] Failed {r['email']}: {e}")
            failed += 1
    print(f"[NEWSLETTER] Done — sent:{sent} failed:{failed}")

@router.post("/admin/newsletter/broadcast")
def broadcast_newsletter(
    payload: BroadcastIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    recipients = _build_recipients(payload.audience, db)
    if not recipients:
        raise HTTPException(status_code=400, detail="No recipients found for selected audience")
    background_tasks.add_task(_broadcast_task, recipients, payload.subject, payload.content)
    return {
        "message": f"Newsletter queued for {len(recipients)} recipient(s). Sending in background.",
        "recipient_count": len(recipients),
        "audience": payload.audience,
    }
