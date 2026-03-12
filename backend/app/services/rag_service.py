import google.generativeai as genai
from app.services.calendar_service import create_calendar_event
from app.core.config import settings
from sqlalchemy.orm import Session
from app.models.user import Project, Tutorial, Product, Freebie, AboutMe, FAQ, BotSettings, Appointment, ContactMessage, Certification, Education, Client
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

genai.configure(api_key=settings.GEMINI_API_KEY)

def build_context(db: Session) -> str:
    """Build full site context for RAG."""
    context_parts = []

    # About
    about = db.query(AboutMe).first()
    if about:
        context_parts.append(f"ABOUT THE OWNER:\nName: {about.name}\nTitle: {about.title}\nBio: {about.bio_paragraphs}")

    # Projects
    projects = db.query(Project).all()
    if projects:
        proj_text = "PROJECTS:\n"
        for p in projects:
            proj_text += f"- Title: {p.title} | Category: {p.category} | Summary: {p.summary or ''} | Tech: {p.tech_stack or ''} | GitHub: {p.github_url or 'N/A'} | Live: {p.live_url or 'N/A'} | Notebook: {p.notebook_url or 'N/A'}\n"
        context_parts.append(proj_text)

    # Tutorials
    tutorials = db.query(Tutorial).filter(Tutorial.is_published == True).all()
    if tutorials:
        tut_text = "BLOG / TUTORIALS:\n"
        for t in tutorials:
            tut_text += f"- Title: {t.title} | Category: {t.category} | Summary: {t.summary or ''} | Tech: {t.tech_stack or ''} | GitHub: {t.github_url or 'N/A'} | Live: {t.live_url or 'N/A'} | Notebook: {t.notebook_url or 'N/A'}\n"
        context_parts.append(tut_text)

    # Products
    products = db.query(Product).filter(Product.is_active == True).all()
    if products:
        prod_text = "SHOP PRODUCTS:\n"
        for p in products:
            prod_text += f"- Title: {p.title} | Category: {p.category or ''} | Price: ${p.price} | Description: {p.description[:200] if p.description else ''} | Shop URL: {p.live_url or 'N/A'}\n"
        context_parts.append(prod_text)

    # Freebies
    freebies = db.query(Freebie).filter(Freebie.is_active == True).all()
    if freebies:
        free_text = "FREE RESOURCES:\n"
        for f in freebies:
            free_text += f"- {f.title}: {f.description[:200] if f.description else ''}\n"
        context_parts.append(free_text)


    # FAQs
    faqs = db.query(FAQ).filter(FAQ.is_active==True).order_by(FAQ.order_index).all()
    if faqs:
        faq_text = "FREQUENTLY ASKED QUESTIONS:\n"
        for f in faqs:
            faq_text += f"Q: {f.question}\nA: {f.answer}\n\n"
        context_parts.append(faq_text)

    # Appointments (upcoming/pending)
    from datetime import datetime, timezone
    appts = db.query(Appointment).filter(Appointment.status != "cancelled").order_by(Appointment.created_at.desc()).limit(20).all()
    if appts:
        appt_text = "BOOKED APPOINTMENTS (do NOT offer these slots):\n"
        for a in appts:
            appt_text += f"- {a.preferred_date} at {a.preferred_time} (booked by {a.full_name})\n"
        context_parts.append(appt_text)

    context_parts.append("""
WEBSITE SECTIONS:
- Home: Landing page with hero, projects showcase, and contact form
- Meet Me: About page with bio and expertise
- Tutorials: Technical tutorials with code snippets and videos
- FreeBies: Free downloadable digital resources
- Shop: Paid digital products (eBooks, source code)
- Contact: Book appointments and send messages

SERVICES OFFERED:
- AI/ML Development and Consulting
- Data Analysis and Visualization
- AI Automation Solutions
- Full Stack Web Application Development
- Technical Tutorials and Mentoring

BOOKING:
- Users can book appointments via the contact form or chatbot
- Appointments are confirmed via email

CONTACT:
- Users can send messages through the contact form
""")

    return "\n\n".join(context_parts)


SYSTEM_PROMPT = """You are GAB, Tunji Ologun's Personal AI Assistant on MyWorkSpace.

CONVERSATION FLOW (follow this strictly for NEW conversations):
TURN 1 — Your VERY FIRST message must always be:
"Hi! I am Gab, Tunji's Personal Assistant 👋 How can I help you today?"

TURN 2 — After the user's first message, regardless of what they say, respond:
"Thank you for reaching out! To make sure Tunji can get back to you, kindly type your name, a comma, then your email address (e.g. John, john@email.com) — or type your name only if you prefer."

TURN 3 — Once the user provides their name (with or without email), greet them personally:
"Hi [FirstName], you are welcome to Tunji's WorkSpace! 😊 How can I help you today?"
Then continue naturally based on what they need.

MEMORY: Remember the user's name and email throughout the conversation. Use their first name naturally.

APPOINTMENT BOOKING: When a user wants to book an appointment, collect:
- Full name (you may already have it)
- Email (you may already have it)
- Phone number
- Preferred date (YYYY-MM-DD format)
- Preferred time (HH:MM format)
- Message/purpose

Check the BOOKED APPOINTMENTS in context — do NOT offer already-booked slots.
When you have all details, include this tag in your response:
[APPOINTMENT_REQUEST: name="...", email="...", phone="...", date="...", time="...", message="..."]

WHAT YOU CAN ANSWER:
1. Projects: title, category, summary, tech stack, GitHub URL, live URL, notebook URL
2. Shop products: title, category, description, price, shop URL
3. Blog/tutorials: title, category, summary, tech stack, GitHub URL, live URL
4. About Tunji: bio, services offered — refer users to the Meet Me page for CV, certifications, education, clients
5. FAQs: answer from the FAQ list provided
6. Booking appointments

WHAT YOU MUST NOT DO:
- Do not print the entire website content
- Do not answer questions outside the scope above
- Do not offer booked time slots

Keep responses concise, warm and professional. Brand: MyWorkSpace, color #00a862.
"""

async def chat_with_rag(message: str, history: list, db: Session) -> dict:
    """Process chat message with RAG context."""
    try:
        context = build_context(db)
        # Use custom prompt from DB if set, else fall back to default
        custom_prompt = None
        try:
            bs = db.query(BotSettings).first()
            if bs and bs.system_prompt:
                custom_prompt = bs.system_prompt
        except Exception:
            pass
        final_prompt = (custom_prompt or SYSTEM_PROMPT) + f"\n\nWEBSITE CONTEXT:\n{context}"
        model = genai.GenerativeModel(
            model_name="gemini-flash-latest",
            system_instruction=final_prompt
        )

        # Build chat history
        gemini_history = []
        for h in history[-10:]:  # Last 10 messages for context
            gemini_history.append({"role": h["role"], "parts": [h["content"]]})

        chat = model.start_chat(history=gemini_history)
        response = chat.send_message(message)
        response_text = response.text

        # Check for appointment request
        appointment_data = None
        if "[APPOINTMENT_REQUEST:" in response_text:
            import re
            match = re.search(r'\[APPOINTMENT_REQUEST:(.*?)\]', response_text)
            if match:
                attrs = match.group(1)
                appointment_data = {}
                for attr in re.findall(r'(\w+)="([^"]*)"', attrs):
                    appointment_data[attr[0]] = attr[1]
                response_text = response_text.replace(match.group(0), "").strip()

                # Save appointment and send email
                if appointment_data.get("email"):
                    await save_appointment_and_notify(appointment_data, db)

        # Log conversation to contact_messages if user provided name/email
        try:
            from app.models.user import ContactMessage
            user_name = None
            user_email = None
            # Extract name/email from history if available
            for h in history:
                if h.get("role") == "user":
                    txt = h.get("content", "")
                    if "," in txt and "@" in txt:
                        parts = txt.split(",", 1)
                        user_name = parts[0].strip()
                        user_email = parts[1].strip()
                        break
                    elif not user_name and len(txt.split()) <= 3 and "@" not in txt:
                        user_name = txt.strip()
            if user_name and user_email:
                # Save full conversation as a contact message
                full_convo = "\n".join([f"{h['role'].upper()}: {h['content']}" for h in history[-10:]])
                full_convo += f"\nUSER: {message}\nGAB: {response_text}"
                existing = db.query(ContactMessage).filter(
                    ContactMessage.email == user_email,
                    ContactMessage.message.like("%[CHAT LOG]%")
                ).order_by(ContactMessage.created_at.desc()).first()
                if not existing:
                    log_msg = ContactMessage(
                        full_name=user_name,
                        email=user_email,
                        message=f"[CHAT LOG]\n{full_convo}"
                    )
                    db.add(log_msg)
                    db.commit()
                    # Email notification
                    try:
                        send_email(
                            "info@myworkspace.snipal.uk",
                            f"💬 New Chat from {user_name}",
                            f"<pre style='font-family:monospace;background:#020c18;color:#e2e8f0;padding:20px;border-radius:8px'>{full_convo}</pre>"
                        )
                    except Exception:
                        pass
        except Exception as e:
            print(f"[CHAT LOG ERROR] {e}")

        return {
            "response": response_text,
            "appointment_booked": appointment_data is not None,
            "appointment_data": appointment_data
        }
    except Exception as e:
        return {
            "response": f"I'm having trouble connecting right now. Please try again or use the contact form directly. Error: {str(e)[:100]}",
            "appointment_booked": False,
            "appointment_data": None
        }

async def save_appointment_and_notify(data: dict, db: Session):
    """Save appointment to DB, send email, create calendar event, schedule reminders."""
    from app.models.user import Appointment
    appt = Appointment(
        full_name=data.get("name", ""),
        email=data.get("email", ""),
        phone=data.get("phone", ""),
        preferred_date=data.get("date", ""),
        preferred_time=data.get("time", ""),
        message=data.get("message", "")
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    try:
        send_appointment_email(data)
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
    try:
        if data.get("date"):
            create_calendar_event(
                name=data.get("name", ""),
                email=data.get("email", ""),
                date_str=data.get("date", ""),
                time_str=data.get("time", "09:00"),
                message=data.get("message", "")
            )
    except Exception as e:
        print(f"[CALENDAR ERROR] {e}")
    try:
        import asyncio
        from app.core.config import settings as cfg
        asyncio.create_task(send_appointment_reminders(appt.id, cfg.DATABASE_URL))
    except Exception as e:
        print(f"[REMINDER ERROR] {e}")

# ─── EMAIL HELPERS ────────────────────────────────────────────────
# SMTP Configuration for Namecheap Private Email
# Sender  : info@myworkspace.snipal.uk  (FROM_EMAIL in .env)
# SMTP    : mail.privateemail.com  port 587 STARTTLS  (SMTP_HOST / SMTP_PORT)
# Login   : info@myworkspace.snipal.uk  (SMTP_USER)
# Password: <your Namecheap private email password>  (SMTP_PASSWORD)
# Reply-To: tunjiologun@gmail.com  (ADMIN_EMAIL)  — replies land in Gmail
#
# Required .env variables (add / update these):
#   SMTP_HOST=mail.privateemail.com
#   SMTP_PORT=587
#   SMTP_USER=info@myworkspace.snipal.uk
#   SMTP_PASSWORD=<PrivateEmail password>
#   FROM_EMAIL=info@myworkspace.snipal.uk
#   ADMIN_EMAIL=tunjiologun@gmail.com

def _make_smtp_connection():
    """Create and return an authenticated SMTP connection."""
    server = smtplib.SMTP(settings.SMTP_HOST, int(settings.SMTP_PORT))
    server.ehlo()
    server.starttls()
    server.ehlo()
    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
    return server


def _base_msg(to_email: str, subject: str) -> MIMEMultipart:
    """Build a base MIMEMultipart message with standard headers."""
    msg = MIMEMultipart("alternative")
    msg['From'] = f"MyWorkSpace <{settings.FROM_EMAIL}>"
    msg['To'] = to_email
    msg['Subject'] = subject
    msg['Reply-To'] = settings.ADMIN_EMAIL   # replies go to Gmail
    return msg


def send_appointment_email(data: dict):
    """Send appointment notification email to admin."""
    if not settings.SMTP_USER:
        return
    msg = _base_msg(settings.ADMIN_EMAIL,
                    f"New Appointment Request from {data.get('name', 'Unknown')}")
    body = f"""
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#020c18;color:#e2e8f0;border-radius:12px;">
  <h2 style="color:#00a862;">📅 New Appointment Request</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:8px 0;color:#94a3b8;">Name</td><td style="padding:8px 0;">{data.get('name','')}</td></tr>
    <tr><td style="padding:8px 0;color:#94a3b8;">Email</td><td style="padding:8px 0;">{data.get('email','')}</td></tr>
    <tr><td style="padding:8px 0;color:#94a3b8;">Phone</td><td style="padding:8px 0;">{data.get('phone','Not provided')}</td></tr>
    <tr><td style="padding:8px 0;color:#94a3b8;">Date</td><td style="padding:8px 0;">{data.get('date','Not specified')}</td></tr>
    <tr><td style="padding:8px 0;color:#94a3b8;">Message</td><td style="padding:8px 0;">{data.get('message','')}</td></tr>
  </table>
  <p style="margin-top:24px;color:#94a3b8;font-size:13px;">Reply directly to this email to respond to the client.</p>
</div>
"""
    msg.attach(MIMEText(body, 'html'))
    try:
        with _make_smtp_connection() as server:
            server.send_message(msg)
    except Exception as e:
        print(f"[EMAIL ERROR] appointment: {e}")



def send_freebie_confirm_email(to_email: str, name: str, freebie_title: str, confirm_url: str):
    """Send email confirmation link before allowing freebie download."""
    if not settings.SMTP_USER:
        return
    msg = _base_msg(to_email, f"Confirm your download: {freebie_title} — MyWorkSpace")
    body = f"""
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#020c18;color:#e2e8f0;border-radius:12px;">
  <h2 style="color:#00a862;">Email Confirmation Required</h2>
  <p>Hi <strong>{name}</strong>,</p>
  <p>You requested to download <strong style="color:#00c8ff;">{freebie_title}</strong> from <strong>MyWorkSpace</strong>.</p>
  <p>Please confirm your email address to get your free download:</p>
  <a href="{confirm_url}" style="display:inline-block;margin:20px 0;padding:14px 32px;background:#00a862;color:#000;font-weight:bold;border-radius:8px;text-decoration:none;">
    Confirm & Download
  </a>
  <p style="color:#94a3b8;font-size:13px;">This link expires in 24 hours. If you did not request this, ignore this email.</p>
  <p style="font-size:12px;color:#64748b;margin-top:24px;">Sent from MyWorkSpace</p>
</div>
"""
    msg.attach(MIMEText(body, 'html'))
    try:
        with _make_smtp_connection() as server:
            server.send_message(msg)
    except Exception as e:
        print(f"[EMAIL ERROR] freebie confirm: {e}")

def send_freebie_email(to_email: str, name: str, freebie_title: str, download_url: str):
    """Send freebie download link to user."""
    if not settings.SMTP_USER:
        return
    msg = _base_msg(to_email, f"Your Free Download: {freebie_title} — MyWorkSpace")
    body = f"""
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#020c18;color:#e2e8f0;border-radius:12px;">
  <h2 style="color:#00a862;">🎁 Your Free Download is Ready!</h2>
  <p>Hi <strong>{name}</strong>,</p>
  <p>Thank you for downloading from <strong>MyWorkSpace</strong>!</p>
  <p style="color:#94a3b8;">Your file: <strong style="color:#e2e8f0;">{freebie_title}</strong></p>
  <a href="{download_url}" style="display:inline-block;margin:20px 0;padding:14px 32px;background:#00a862;color:#000;font-weight:bold;border-radius:8px;text-decoration:none;">
    ⬇️ Download Now
  </a>
  <p style="font-size:12px;color:#64748b;margin-top:24px;">
    Sent from info@myworkspace.snipal.uk · MyWorkSpace<br>
    You received this because you requested a download on our website.
  </p>
</div>
"""
    msg.attach(MIMEText(body, 'html'))
    try:
        with _make_smtp_connection() as server:
            server.send_message(msg)
    except Exception as e:
        print(f"[EMAIL ERROR] freebie: {e}")


def send_purchase_email(to_email: str, name: str, products: list, download_urls: list):
    """Send purchase confirmation with download links."""
    if not settings.SMTP_USER:
        return
    msg = _base_msg(to_email, "Your Purchase from MyWorkSpace — Download Links Inside")
    items_html = "".join(
        f'<li style="margin-bottom:12px;"><strong>{p["title"]}</strong><br>'
        f'<a href="{url}" style="color:#00a862;">{url}</a></li>'
        for p, url in zip(products, download_urls)
    )
    body = f"""
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#020c18;color:#e2e8f0;border-radius:12px;">
  <h2 style="color:#00a862;">🛒 Purchase Confirmed!</h2>
  <p>Hi <strong>{name}</strong>, thank you for your purchase from <strong>MyWorkSpace</strong>!</p>
  <h3 style="color:#e2e8f0;margin-top:24px;">Your Downloads:</h3>
  <ul style="list-style:none;padding:0;">{items_html}</ul>
  <p style="font-size:12px;color:#64748b;margin-top:32px;">
    Sent from info@myworkspace.snipal.uk · MyWorkSpace
  </p>
</div>
"""
    msg.attach(MIMEText(body, 'html'))
    try:
        with _make_smtp_connection() as server:
            server.send_message(msg)
    except Exception as e:
        print(f"[EMAIL ERROR] purchase: {e}")


def send_email(to_email: str, subject: str, html_body: str):
    """Generic HTML email sender used for newsletters, notifications, role upgrades etc."""
    if not settings.SMTP_USER:
        print(f"[EMAIL SKIPPED — no SMTP config] To: {to_email} | Subject: {subject}")
        return
    msg = _base_msg(to_email, subject)
    msg.attach(MIMEText(html_body, 'html'))
    try:
        with _make_smtp_connection() as server:
            server.send_message(msg)
    except Exception as e:
        print(f"[EMAIL ERROR] generic | To: {to_email} | {e}")

import asyncio
from datetime import datetime, timedelta

async def send_appointment_reminders(appt_id: int, db_url: str):
    """Send 3 email reminders: 24h, 10h, 1h before appointment."""
    import asyncio
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models.user import Appointment
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)

    reminder_offsets = [
        (24 * 3600, "24 hours"),
        (10 * 3600, "10 hours"),
        (1 * 3600,  "1 hour"),
    ]

    for offset_secs, label in reminder_offsets:
        db = SessionLocal()
        try:
            appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
            if not appt or not appt.preferred_date:
                return
            try:
                appt_dt = datetime.strptime(f"{appt.preferred_date} {appt.preferred_time or '09:00'}", "%Y-%m-%d %H:%M")
            except Exception:
                return
            now = datetime.utcnow()
            send_at = appt_dt - timedelta(seconds=offset_secs)
            wait_secs = (send_at - now).total_seconds()
            if wait_secs > 0:
                await asyncio.sleep(wait_secs)
            # Send reminder
            html = f"""
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#020c18;color:#e2e8f0;border-radius:12px;">
  <h2 style="color:#00a862;">⏰ Appointment Reminder — {label} to go</h2>
  <p><strong>Client:</strong> {appt.full_name}</p>
  <p><strong>Email:</strong> {appt.email}</p>
  <p><strong>Phone:</strong> {appt.phone or 'N/A'}</p>
  <p><strong>Date:</strong> {appt.preferred_date}</p>
  <p><strong>Time:</strong> {appt.preferred_time or 'N/A'}</p>
  <p><strong>Message:</strong> {appt.message or 'N/A'}</p>
</div>"""
            send_email(settings.ADMIN_EMAIL, f"⏰ Reminder ({label}): Appointment with {appt.full_name}", html)
        finally:
            db.close()
