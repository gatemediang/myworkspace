# MyWorkSpace – Full Stack Portfolio Platform

> Built with **FastAPI** · **Next.js 14** · **PostgreSQL** · **Gemini AI RAG Chatbot (GAB)** · **Stripe Payments** · **Google Calendar**

A production-ready personal portfolio and digital business platform. Includes a CMS admin dashboard, AI-powered chatbot assistant, Stripe e-commerce, newsletter system, Google Calendar appointment booking, and a full blog/tutorial engine.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start (Docker)](#quick-start-docker)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Default Accounts](#default-accounts)
- [Pages & Features](#pages--features)
- [Admin Dashboard](#admin-dashboard)
- [GAB — AI Chatbot](#gab--ai-chatbot)
- [E-commerce (Stripe)](#e-commerce-stripe)
- [Newsletter System](#newsletter-system)
- [Appointments & Google Calendar](#appointments--google-calendar)
- [User Roles & Permissions](#user-roles--permissions)
- [API Reference](#api-reference)
- [Railway Deployment](#railway-deployment)
- [Running Tests](#running-tests)
- [Design System](#design-system)

---

## Architecture

```
myworkspace/
├── backend/                        # FastAPI Python backend
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes.py           # All API endpoints (~1 500 lines)
│   │   │   └── newsletter.py       # Newsletter subscribe/unsubscribe helpers
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic-settings (reads .env)
│   │   │   ├── database.py         # SQLAlchemy engine + SessionLocal
│   │   │   └── security.py         # JWT, password hashing, role guards
│   │   ├── models/
│   │   │   └── user.py             # All ORM models (User, Project, Tutorial,
│   │   │                           #   Product, Order, Freebie, Appointment,
│   │   │                           #   ContactMessage, SiteSettings, AboutMe,
│   │   │                           #   NewsletterSubscriber, Notification,
│   │   │                           #   HeroSlide, Certification, Education,
│   │   │                           #   Client, FAQ, BotSettings)
│   │   └── services/
│   │       ├── rag_service.py      # Gemini AI chat, RAG context builder,
│   │       │                       #   all email helpers, appointment reminders
│   │       └── calendar_service.py # Google Calendar API integration
│   ├── tests/
│   │   ├── conftest.py             # pytest fixtures (SQLite in-memory DB)
│   │   └── test_api.py             # 93 tests covering all endpoints
│   ├── uploads/                    # Served as /uploads/* static files
│   │   ├── projects/
│   │   ├── tutorials/
│   │   ├── product_images/
│   │   ├── products/               # Digital files for purchase download
│   │   ├── freebies/               # Free download files
│   │   ├── freebie_images/
│   │   ├── about/                  # Profile photo, CV
│   │   ├── settings/               # Site logo, chatbot photo
│   │   ├── hero_slides/
│   │   ├── certifications/
│   │   ├── education/
│   │   ├── clients/
│   │   └── project_sourcecode/
│   ├── main.py                     # App factory, CORS, startup events, seeding
│   ├── requirements.txt
│   ├── requirements-test.txt
│   └── Dockerfile
│
├── frontend/                       # Next.js 14 (App Router, TypeScript)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Home SPA (hero, projects, contact)
│   │   │   ├── admin/
│   │   │   │   └── page.tsx        # Full CMS admin dashboard
│   │   │   ├── meet-me/            # About / biography page
│   │   │   ├── tutorials/          # Tutorial listing + [slug] detail
│   │   │   ├── shop/               # Product listing + Stripe checkout
│   │   │   ├── freebies/           # Free downloads
│   │   │   └── login/              # Auth page
│   │   ├── components/
│   │   │   └── chat/
│   │   │       └── ChatBot.tsx     # GAB chatbot widget
│   │   └── lib/                    # API client, Zustand store
│   ├── next.config.js
│   └── Dockerfile
│
├── docker-compose.yml              # Local dev: PostgreSQL + backend + frontend
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend framework** | FastAPI 0.111 |
| **ORM / database** | SQLAlchemy 2.0 + PostgreSQL 16 (SQLite for tests) |
| **Migrations** | Alembic + runtime `create_all` + inline `ALTER TABLE IF NOT EXISTS` |
| **Auth** | JWT (python-jose) + bcrypt (passlib) |
| **AI chatbot** | Google Gemini (`gemini-flash-latest`) via `google-generativeai` |
| **Payments** | Stripe Checkout + webhooks |
| **Email** | SMTP via `smtplib` (Namecheap Private Email / Gmail) |
| **Calendar** | Google Calendar API (`google-api-python-client`) |
| **File uploads** | `python-multipart` — validated extension whitelist + size limit |
| **Frontend** | Next.js 14 App Router + TypeScript + Tailwind CSS |
| **State** | Zustand |
| **Markdown** | `react-markdown` + `python-markdown` (server-side render) |
| **Animations** | Framer Motion |
| **Containerisation** | Docker + Docker Compose |
| **Hosting target** | Railway |

---

## Quick Start (Docker)

### 1. Clone and configure

```bash
git clone <repo-url>
cd myworkspace
cp backend/.env.example backend/.env
# Edit backend/.env — fill in all required keys (see Environment Variables)
```

### 2. (Optional) Add Google Calendar credentials

Place your Google service-account JSON at:

```
backend/google-credentials.json
```

If omitted, calendar features are silently skipped — everything else works normally.

### 3. Start all services

```bash
POSTGRES_PASSWORD=your_db_password docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Interactive API docs | http://localhost:8000/docs |

---

## Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start a local Postgres (or use the Docker db service)
createdb workspace_db

cp .env.example .env            # then fill in your keys

uvicorn main:app --reload --port 8000
```

Tables are created automatically on first startup. Default admin accounts are seeded (see [Default Accounts](#default-accounts)).

### Frontend

```bash
cd frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev      # http://localhost:3000
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
# ── Database ──────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:password@localhost:5432/workspace_db
# On Railway add: ?sslmode=require at the end of DATABASE_URL
REQUIRE_SSL=false              # Set true on Railway / managed Postgres

# ── Security ──────────────────────────────────────────────────────
SECRET_KEY=change-me-to-a-random-64-char-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200   # 30 days

# ── AI ────────────────────────────────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key

# ── Stripe ────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ── Email (SMTP) ──────────────────────────────────────────────────
SMTP_HOST=mail.privateemail.com     # or smtp.gmail.com
SMTP_PORT=587
SMTP_USER=info@yourdomain.com
SMTP_PASSWORD=your_email_password
FROM_EMAIL=info@yourdomain.com
ADMIN_EMAIL=you@gmail.com           # Reply-To; receives all notifications

# ── URLs ──────────────────────────────────────────────────────────
APP_URL=https://yoursite.railway.app          # Frontend public URL
BACKEND_URL=https://api.yoursite.railway.app  # Backend public URL
ALLOWED_ORIGINS=https://yoursite.railway.app  # Comma-separated CORS origins

# ── Google Calendar ───────────────────────────────────────────────
GOOGLE_CREDENTIALS_PATH=/app/google-credentials.json
GOOGLE_CALENDAR_ID=your_calendar_id@group.calendar.google.com

# ── Uploads ───────────────────────────────────────────────────────
UPLOAD_DIR=uploads
MAX_FILE_SIZE=52428800   # 50 MB
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=https://api.yoursite.railway.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## Default Accounts

Created automatically on first boot — **change both passwords immediately**.

| Role | Email | Password |
|------|-------|----------|
| Superuser | `superuser@workspace.com` | `Super@123` |
| Admin | `admin@workspace.com` | `Admin@123` |

---

## Pages & Features

| Page | Route | Description |
|------|-------|-------------|
| **Home** | `/` | Hero slider with animated phrases, projects showcase by category, contact form, GAB chatbot |
| **Meet Me** | `/meet-me` | Bio, services, certifications, education, client logos |
| **Tutorials** | `/tutorials` | Blog posts with markdown, code highlighting, video links, notebook links |
| **Tutorial Detail** | `/tutorials/[slug]` | Full post, comments, likes, related tutorials |
| **Shop** | `/shop` | Digital products (eBooks, source code) with Stripe Checkout |
| **FreeBies** | `/freebies` | Free resources — email confirmation before download link is sent |
| **Login / Register** | `/login` | JWT authentication |
| **Admin Dashboard** | `/admin` | Full CMS (see below) |

---

## Admin Dashboard

The `/admin` page is a single-page CMS covering every content area:

| Section | Capabilities |
|---------|-------------|
| **Dashboard Stats** | Users, projects, tutorials, orders, contacts, appointments, subscribers |
| **Hero Slides** | Upload/order/delete homepage slider images with captions |
| **Hero Phrases** | Edit the 3 animated typewriter phrases on the hero |
| **Projects** | CRUD with image, source-code file, GitHub/live/notebook URLs, category, featured flag |
| **Tutorials / Blog** | CRUD with cover image, markdown content, category, tech stack, video/notebook/GitHub URLs, publish toggle |
| **Shop Products** | CRUD with product image, digital file upload, pricing, Stripe integration |
| **FreeBies** | CRUD with image and downloadable file |
| **Certifications** | Upload certificate image + metadata |
| **Education** | School, degree, dates, logo |
| **Clients / Clientele** | Client logo + name carousel |
| **About Me** | Bio paragraphs (HTML), profile photo, CV upload, social links, topics list |
| **FAQs** | Question/answer pairs shown on site and fed into chatbot context |
| **Bot Settings** | Override the chatbot system prompt at runtime |
| **Chatbot Photo** | Upload the avatar shown in the chat widget |
| **Site Logo** | Upload/replace the site logo |
| **Contacts** | View and delete submitted contact messages and chat logs |
| **Appointments** | View all booked appointments |
| **Newsletter** | View subscribers, send broadcast emails |
| **Users** | View all registered users, change roles, toggle active status |

---

## GAB — AI Chatbot

**GAB** (Tunji's Personal AI Assistant) is embedded as a floating widget on every page.

### How it works

1. **RAG context** — on every message, `build_context()` queries the live database and injects: projects, published tutorials, active products, freebies, FAQs, upcoming appointments, and the About Me section.
2. **Gemini Flash** — the context + system prompt are sent to `gemini-flash-latest`. The system prompt can be overridden at runtime via Bot Settings in the admin dashboard.
3. **Conversation flow** — GAB follows a structured intro:
   - Turn 1: greeting
   - Turn 2: asks for name + email
   - Turn 3: personalised welcome, then open conversation
4. **Appointment booking** — when GAB collects all booking details it embeds an `[APPOINTMENT_REQUEST: ...]` tag in the response. The backend parses it, saves the appointment to the DB, emails admin, creates a Google Calendar event, and schedules 3 email reminders (24 h, 10 h, 1 h before).
5. **Chat logging** — once name + email are identified from the conversation, the full chat log is saved as a `ContactMessage` and admin is notified by email.

### Blocked slots

`GET /api/blocked-slots` returns all booked appointment date/time pairs so the frontend (and GAB) can avoid offering already-taken slots.

---

## E-commerce (Stripe)

1. Admin uploads a digital product with a file and price.
2. Visitor clicks **Buy** → frontend calls `POST /api/shop/checkout` → Stripe Checkout session created → visitor redirected to Stripe.
3. After payment, Stripe sends a webhook to `POST /api/shop/webhook`.
4. Backend marks the order as `paid`, generates signed download URLs, and emails them to the customer.

**Webhook URL to set in Stripe dashboard:**
```
https://your-backend-domain/api/shop/webhook
```

### Quick Buy (single product)

`POST /api/shop/quick-buy` creates a single-product Stripe session — used for the "Buy Now" button on product cards.

---

## Newsletter System

- `POST /api/newsletter/subscribe` — saves subscriber, sends a confirmation email with a link.
- `GET /api/newsletter/confirm?token=...` — confirms the subscriber; re-subscribing a confirmed address returns 400.
- `POST /api/newsletter/unsubscribe` — marks subscriber inactive.
- `POST /api/admin/newsletter/broadcast` — sends an HTML email to all confirmed subscribers (admin only).
- When a new tutorial is published, all confirmed subscribers receive an automatic notification email.

---

## Appointments & Google Calendar

Appointments can be booked via:
- The **contact form** on the home page (`POST /api/contact`)
- The **GAB chatbot** (fully conversational booking flow)

On every new appointment:
1. Saved to the `appointments` table.
2. Admin receives a notification email.
3. A Google Calendar event is created (if credentials are configured).
4. Three reminder emails are scheduled: 24 h, 10 h, and 1 h before the appointment time.

---

## User Roles & Permissions

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **Superuser** | Site owner | Everything — including promoting/demoting admins |
| **Admin** | Content manager | All CRUD, all admin routes, user role management |
| **Instructor** | Content creator | Create/edit projects and tutorials only |
| **Moderator** | Community | Moderate comments |
| **Guest** | Public user | Read, like, comment on tutorials |

> Shop products and freebies require **Admin** level or above — instructors cannot publish paid or free digital products.

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register new user, returns JWT |
| POST | `/api/auth/login` | — | Login (OAuth2 form), returns JWT |
| GET | `/api/auth/me` | User | Get current user profile |

### Public Content

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects (optional `?category=`) |
| GET | `/api/projects/{slug}` | Single project |
| GET | `/api/tutorials` | List published tutorials |
| GET | `/api/tutorials/{slug}` | Single tutorial with content |
| GET | `/api/blog` | Blog posts (tutorials published to blog) |
| GET | `/api/products` | List active shop products |
| GET | `/api/products/{slug}` | Single product |
| GET | `/api/freebies` | List active freebies |
| GET | `/api/certifications` | List certifications |
| GET | `/api/education` | List education entries |
| GET | `/api/clients` | List client logos |
| GET | `/api/faqs` | List active FAQs |
| GET | `/api/about` | About Me content |
| GET | `/api/hero-slides` | Homepage slider slides |
| GET | `/api/site-settings/hero-phrases` | 3 animated hero phrases |
| GET | `/api/site-settings/{key}` | Generic site setting by key |
| GET | `/api/blocked-slots` | Booked appointment date/time list |

### Interactions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/chat` | — | GAB chatbot (RAG + Gemini) |
| POST | `/api/contact` | — | Contact form / appointment request |
| POST | `/api/freebies/download` | — | Request freebie (sends confirmation email) |
| GET | `/api/freebies/confirm` | — | Confirm email, get download link |
| POST | `/api/newsletter/subscribe` | — | Subscribe to newsletter |
| GET | `/api/newsletter/confirm` | — | Confirm newsletter subscription |
| POST | `/api/newsletter/unsubscribe` | — | Unsubscribe |

### Shop

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/shop/checkout` | — | Create Stripe Checkout session (cart) |
| POST | `/api/shop/quick-buy` | — | Create Stripe session (single product) |
| POST | `/api/shop/webhook` | Stripe sig | Stripe payment webhook |
| GET | `/api/shop/success` | — | Post-payment success redirect |
| GET | `/api/orders/{order_id}/downloads` | — | Get signed download URLs |

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | User | Get user notifications |
| POST | `/api/notifications/read-all` | User | Mark all as read |

### Admin — Content

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST/PUT/DELETE | `/api/admin/projects` | Project CRUD |
| DELETE | `/api/admin/projects/{id}/file/{field}` | Clear a project file field |
| POST/PUT/DELETE | `/api/admin/tutorials` | Tutorial CRUD |
| POST/PUT/DELETE | `/api/admin/products` | Product CRUD |
| POST/PUT/DELETE | `/api/admin/freebies` | Freebie CRUD |
| POST/PUT/DELETE | `/api/admin/certifications` | Certification CRUD |
| POST/PUT/DELETE | `/api/admin/education` | Education CRUD |
| POST/PUT/DELETE | `/api/admin/clients` | Client CRUD |
| GET/POST/PUT/DELETE | `/api/admin/faqs` | FAQ CRUD |
| GET/PUT | `/api/admin/bot-settings` | Chatbot system prompt |
| GET/PUT | `/api/admin/about` | About Me content |
| GET/POST/PUT/DELETE | `/api/admin/hero-slides` | Hero slider management |

### Admin — Site Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/admin/site-settings/{key}` | Set generic key/value setting |
| PUT | `/api/admin/site-settings/hero-phrases` | Update 3 animated phrases |
| PUT | `/api/admin/site-settings/chatbot_photo/upload` | Upload chatbot avatar |
| PUT | `/api/admin/site-settings/logo/upload` | Upload site logo |
| GET | `/api/site-settings/logo/current` | Get current logo URL |

### Admin — People & Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/contacts` | All contact messages |
| DELETE | `/api/admin/contacts/{id}` | Delete contact message |
| GET | `/api/admin/appointments` | All appointments |
| GET | `/api/admin/newsletter/subscribers` | All newsletter subscribers |
| POST | `/api/admin/newsletter/broadcast` | Send broadcast email |
| GET | `/api/admin/users` | All registered users |
| PUT | `/api/admin/users/{id}/role` | Change user role |
| PUT | `/api/admin/users/{id}/toggle-active` | Enable / disable user |
| GET | `/api/admin/freebie-downloads` | Freebie download records |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Root ping |
| GET | `/health` | Health check (used by Docker + Railway) |

Full interactive docs: `http://localhost:8000/docs`

---

## Railway Deployment

### Backend service

1. Create a **PostgreSQL** database in Railway and copy the `DATABASE_URL`.
2. Add `?sslmode=require` to the end of the URL:
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
   ```
3. Set `REQUIRE_SSL=true`.
4. Set all other required env vars (see [Environment Variables](#environment-variables)).
5. Set `ALLOWED_ORIGINS` to your Railway frontend URL.
6. Add `google-credentials.json` as a Railway secret file mounted at `/app/google-credentials.json` (or set `GOOGLE_CREDENTIALS_PATH` to wherever it is mounted).

### Frontend service

Set build variables:
```env
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
BACKEND_INTERNAL_URL=http://backend.railway.internal:8000   # private networking
```

### Uploads / file persistence

Railway has **ephemeral storage** — uploaded files are lost on redeploy.

For production you should store uploads in object storage (AWS S3, Cloudflare R2, etc.) and update `save_upload()` in `routes.py` to write there instead of the local filesystem.

Until then, uploads persist within a single deployment session and are cleared on the next deploy.

### Stripe webhook

In the Stripe dashboard, add an endpoint:
```
https://your-backend.up.railway.app/api/shop/webhook
```
Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

---

## Running Tests

```bash
cd backend
pip install -r requirements.txt -r requirements-test.txt

pytest tests/ -v
```

- Uses an **SQLite in-memory database** — no live PostgreSQL required.
- All external services (Gemini, Google Calendar, SMTP) are mocked.
- 93 tests covering: auth, all CRUD endpoints, admin-only access control, file uploads, contact form, appointments, newsletter, hero slides, site settings, chatbot, notifications, Stripe, and role-based access.

---

## Design System

| Token | Value |
|-------|-------|
| Primary (brand green) | `#00a862` |
| Accent (cyan) | `#00c8ff` |
| Background | `#020c18` (deep navy) |
| Surface | `#0a1628` |
| Text primary | `#e2e8f0` |
| Text muted | `#94a3b8` |
| Display font | Orbitron |
| Body font | Rajdhani |
| Mono font | Fira Code |
| Style | Dark tech aesthetic — circuit board motifs, glow effects |

---

## Security Notes

- File uploads are validated against an **extension whitelist** (`jpg jpeg png gif webp svg pdf zip docx xlsx pptx ipynb csv`) and a configurable **size limit** (`MAX_FILE_SIZE`, default 50 MB).
- Admin routes are protected by `require_admin` (or `require_instructor` for content-creation routes). Shop products and freebies require `require_admin`.
- CORS `allowed_origins` is driven by the `ALLOWED_ORIGINS` env var — never set to `*` in production.
- JWT tokens expire after `ACCESS_TOKEN_EXPIRE_MINUTES` (default 30 days).
- `SECRET_KEY` must be at least 32 characters and kept secret.
