# MyWorkSpace – Full Stack Portfolio Platform

> Built with **FastAPI** · **Next.js 14** · **PostgreSQL** · **Gemini 2.0 Flash RAG Chatbot** · **Stripe Payments**

---

## 🏗️ Architecture

```
workspace/
├── backend/               # FastAPI Python backend
│   ├── app/
│   │   ├── api/routes.py  # All API endpoints
│   │   ├── models/        # SQLAlchemy models
│   │   ├── services/      # RAG chatbot, email
│   │   └── core/          # Config, DB, security
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/              # Next.js 14 frontend
│   ├── src/
│   │   ├── app/           # Pages (App Router)
│   │   ├── components/    # Reusable components
│   │   └── lib/           # API client, Zustand store
│   └── Dockerfile
└── docker-compose.yml
```

---

## 🚀 Quick Start (Docker)

### 1. Clone and configure

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys
```

### 2. Set required environment variables in `backend/.env`

```env
GEMINI_API_KEY=your_gemini_api_key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your_app_password
FROM_EMAIL=your@gmail.com
ADMIN_EMAIL=admin@yoursite.com
APP_URL=http://localhost:3000
```

### 3. Run with Docker Compose

```bash
docker-compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🛠️ Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create PostgreSQL database
createdb workspace_db

# Copy and configure env
cp .env.example .env

# Start server
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
```

---

## 🔐 Default Admin Login

After first startup:
- **Email**: `admin@workspace.com`
- **Password**: `Admin@123`

> ⚠️ Change this password immediately in production!

---

## 📄 Pages & Features

| Page | Route | Description |
|------|-------|-------------|
| Home (SPA) | `/` | Landing + Projects + Contact |
| Meet Me | `/meet-me` | About page |
| Tutorials | `/tutorials` | Tutorial listing with markdown |
| Tutorial | `/tutorials/[slug]` | Full tutorial + comments + likes |
| Shop | `/shop` | Digital products with Stripe |
| FreeBies | `/freebies` | Free downloads with email delivery |
| Login/Signup | `/login` | Authentication |
| Admin | `/admin` | Full CMS dashboard |

---

## 🤖 RAG Chatbot

The chatbot uses **Gemini 2.0 Flash** with full website context injected as RAG:
- Answers questions about projects, tutorials, products
- Books appointments (saves to DB + emails admin)
- Recommends products/tutorials
- Powered by live database content (always up to date)

---

## 🛒 Ecommerce (Stripe)

1. Add products in Admin Dashboard with digital file uploads
2. User adds to cart → enters email → redirected to Stripe Checkout
3. On payment success → Stripe webhook → order marked paid → download links emailed

**Stripe webhook URL**: `POST http://your-domain.com/api/shop/webhook`

---

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access: all CRUD, user management |
| **Instructor** | Create/edit projects, tutorials, products, freebies |
| **Guest** | Read, like tutorials; no edit access |
| **Logged in user** | Read, like, comment on tutorials |

---

## 🎨 Design System

- **Primary color**: `#00a862` (brand green)
- **Background**: Deep navy `#020c18`
- **Fonts**: Orbitron (display) + Rajdhani (body) + Fira Code (mono)
- **Style**: Dark tech aesthetic with circuit board motifs

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login (JWT) |
| POST | `/api/chat` | RAG chatbot |
| GET | `/api/projects` | List projects |
| GET | `/api/tutorials` | List tutorials |
| GET | `/api/products` | List shop products |
| POST | `/api/shop/checkout` | Create Stripe session |
| POST | `/api/freebies/download` | Request freebie download |
| POST | `/api/contact` | Submit contact form |
| GET | `/api/about` | Get about page data |
| GET | `/api/admin/stats` | Admin dashboard stats |

Full API docs available at: `http://localhost:8000/docs`

---

## 🔧 Tech Stack

**Backend**: FastAPI · SQLAlchemy · PostgreSQL · Alembic · JWT · Stripe · Gemini AI · SMTP

**Frontend**: Next.js 14 · TypeScript · Tailwind CSS · Zustand · React Markdown · Framer Motion

**Infrastructure**: Docker · Docker Compose · uvicorn
