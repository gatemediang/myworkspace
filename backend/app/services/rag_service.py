import google.generativeai as genai
from app.core.config import settings
from sqlalchemy.orm import Session
from app.models.user import Project, Tutorial, Product, Freebie, AboutMe
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
            proj_text += f"- {p.title} ({p.category}): {p.summary}\n"
        context_parts.append(proj_text)

    # Tutorials
    tutorials = db.query(Tutorial).filter(Tutorial.is_published == True).all()
    if tutorials:
        tut_text = "TUTORIALS:\n"
        for t in tutorials:
            tut_text += f"- {t.title} ({t.category}): {t.summary}\n"
        context_parts.append(tut_text)

    # Products
    products = db.query(Product).filter(Product.is_active == True).all()
    if products:
        prod_text = "SHOP PRODUCTS:\n"
        for p in products:
            prod_text += f"- {p.title}: ${p.price} - {p.description[:200] if p.description else ''}\n"
        context_parts.append(prod_text)

    # Freebies
    freebies = db.query(Freebie).filter(Freebie.is_active == True).all()
    if freebies:
        free_text = "FREE RESOURCES:\n"
        for f in freebies:
            free_text += f"- {f.title}: {f.description[:200] if f.description else ''}\n"
        context_parts.append(free_text)

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


SYSTEM_PROMPT = """You are the AI assistant for Tunji Ologun's WorkSpace portfolio website.
You are helpful, professional, and friendly. You have full knowledge of the website content provided.

You can:
1. Answer questions about projects, tutorials, products, and services
2. Help users navigate the website
3. Book appointments (collect: name, email, phone, preferred date, message)
4. Forward contact details to the admin email
5. Recommend relevant products or tutorials
6. Explain technical concepts

When booking an appointment, collect all required info and confirm with the user.
When you have collected appointment details, include them in your response in this format:
[APPOINTMENT_REQUEST: name="...", email="...", phone="...", date="...", message="..."]

Keep responses concise and helpful. Use the website context to give accurate answers.
Brand color is #00a862 (green). The site is called MyWorkSpace.
"""

async def chat_with_rag(message: str, history: list, db: Session) -> dict:
    """Process chat message with RAG context."""
    try:
        context = build_context(db)
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=SYSTEM_PROMPT + f"\n\nWEBSITE CONTEXT:\n{context}"
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
    """Save appointment to DB and send email notification."""
    from app.models.user import Appointment
    appt = Appointment(
        full_name=data.get("name", ""),
        email=data.get("email", ""),
        phone=data.get("phone", ""),
        preferred_date=data.get("date", ""),
        message=data.get("message", "")
    )
    db.add(appt)
    db.commit()

    # Send email notification
    try:
        send_appointment_email(data)
    except Exception:
        pass

def send_appointment_email(data: dict):
    """Send appointment notification email."""
    if not settings.SMTP_USER:
        return
    msg = MIMEMultipart()
    msg['From'] = settings.FROM_EMAIL
    msg['To'] = settings.ADMIN_EMAIL
    msg['Subject'] = f"New Appointment Request from {data.get('name', 'Unknown')}"
    body = f"""
New appointment request received:

Name: {data.get('name', '')}
Email: {data.get('email', '')}
Phone: {data.get('phone', 'Not provided')}
Preferred Date: {data.get('date', 'Not specified')}
Message: {data.get('message', '')}

Please respond to the client at: {data.get('email', '')}
"""
    msg.attach(MIMEText(body, 'plain'))
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)

def send_freebie_email(to_email: str, name: str, freebie_title: str, download_url: str):
    """Send freebie download link to user."""
    if not settings.SMTP_USER:
        return
    msg = MIMEMultipart()
    msg['From'] = settings.FROM_EMAIL
    msg['To'] = to_email
    msg['Subject'] = f"Your Free Download: {freebie_title}"
    body = f"""
Hi {name},

Thank you for downloading from MyWorkSpace!

Here is your download link for: {freebie_title}
{download_url}

This link will work for direct download.

Best regards,
Tunji Ologun
MyWorkSpace
"""
    msg.attach(MIMEText(body, 'plain'))
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)

def send_purchase_email(to_email: str, name: str, products: list, download_urls: list):
    """Send purchase confirmation with download links."""
    if not settings.SMTP_USER:
        return
    msg = MIMEMultipart()
    msg['From'] = settings.FROM_EMAIL
    msg['To'] = to_email
    msg['Subject'] = "Your Purchase from MyWorkSpace - Download Links Inside"
    items_text = "\n".join([f"- {p['title']}: {url}" for p, url in zip(products, download_urls)])
    body = f"""
Hi {name},

Thank you for your purchase from MyWorkSpace!

Your download links:
{items_text}

These links are available immediately.

Best regards,
Tunji Ologun
MyWorkSpace
"""
    msg.attach(MIMEText(body, 'plain'))
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
