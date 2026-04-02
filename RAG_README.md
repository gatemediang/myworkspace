# GAB — AI-Powered RAG Chatbot for MyWorkSpace

> **GAB** (short for **G**enerative **A**I **B**ot) is an intelligent, context-aware conversational assistant embedded across the MyWorkSpace portfolio platform. It is powered by Google Gemini and a custom-built Retrieval-Augmented Generation (RAG) pipeline — no vector databases, no third-party AI frameworks. Just clean, purposeful engineering.

---

## Table of Contents

- [Overview](#overview)
- [What is RAG? — How GAB Does It Differently](#what-is-rag--how-gab-does-it-differently)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Conversation Flow](#conversation-flow)
- [Appointment Booking Pipeline](#appointment-booking-pipeline)
- [Email Automation](#email-automation)
- [Google Calendar Integration](#google-calendar-integration)
- [Lead Capture & Chat Logging](#lead-capture--chat-logging)
- [Admin Controls](#admin-controls)
- [Frontend Widget](#frontend-widget)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Design Decisions](#design-decisions)

---

## Overview

GAB is not a generic chatbot — it is a purpose-built AI assistant that knows everything about the MyWorkSpace portfolio in real time. It answers visitor questions about projects, tutorials, shop products, freebies, services, and FAQs. Beyond answering questions, GAB can collect visitor contact details, book appointments, trigger automated calendar events, and send multi-stage email reminders — all within a single natural conversation.

GAB is deployed as a floating widget on every page of the MyWorkSpace frontend and is accessible to all visitors without authentication.

---

## What is RAG? — How GAB Does It Differently

**Retrieval-Augmented Generation (RAG)** is a pattern where an LLM is grounded in real data by retrieving relevant context before generating a response. Traditional RAG implementations typically follow this flow:

```
User Query → Embed Query → Vector Similarity Search → Retrieve Chunks → LLM → Response
```

This usually requires:
- An embedding model (e.g., OpenAI `text-embedding-ada-002`)
- A vector store (e.g., FAISS, Pinecone, Chroma)
- Index building and maintenance pipelines

### GAB's Approach: Database-Driven Context Injection

GAB uses a **simpler, more appropriate** RAG variant for a portfolio context:

```
User Message → Query PostgreSQL → Build Structured Context String → Inject into Gemini Prompt → Response
```

Instead of embedding-based similarity search, GAB calls `build_context(db)` on **every message**, which dynamically queries the live PostgreSQL database and assembles a fully structured, human-readable context block. This context is then injected directly into the Gemini system prompt before the model generates a response.

**Why no FAISS or vector store?**

| Concern | Vector RAG | GAB's Approach |
|---|---|---|
| Dataset size | Large (thousands of docs) | Small, structured (portfolio data) |
| Data freshness | Requires re-indexing | Always live from DB |
| Complexity | High (embedding pipeline, index) | Low (SQL queries) |
| Relevance risk | May miss relevant chunks | Full context, always complete |
| Maintenance | High | Zero index maintenance |

For a portfolio application with structured, bounded data, database-driven RAG is the right engineering choice — not a shortcut.

---

## Features

- **Real-time context retrieval** from PostgreSQL on every chat message
- **Structured 3-turn onboarding flow** for greeting, lead capture, and personalized assistance
- **Full appointment booking** via natural conversation — no forms required
- **Google Calendar event creation** with attendee invite on booking
- **3-stage automated email reminders** (24h, 10h, 1h before appointment)
- **Admin confirmation email** on every new booking
- **Slot conflict detection** — GAB reads existing appointments and refuses to offer booked slots
- **Chat session logging** to the database when a visitor provides contact details
- **Admin-configurable system prompt** — override GAB's persona from the dashboard
- **Admin-uploadable chatbot avatar** — fully customizable photo or fallback to bot icon
- **Dynamic FAQ quick-prompts** — fetched live from admin-managed FAQ list
- **Markdown rendering** in the frontend for rich, formatted responses
- **Responsive floating widget** — works on mobile and desktop

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 14)                    │
│                                                             │
│   ┌────────────────────────────────────────────────────┐    │
│   │               ChatBot.tsx (Widget)                 │    │
│   │  - Floating toggle button (bottom-right)           │    │
│   │  - Message history with ReactMarkdown rendering    │    │
│   │  - Dynamic FAQ quick-prompts (via /api/faqs)       │    │
│   │  - Admin avatar via /api/site-settings             │    │
│   └───────────────────────┬────────────────────────────┘    │
│                           │ POST /api/chat                   │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    BACKEND (FastAPI)                         │
│                                                             │
│   routes.py ──► chat_with_rag()                             │
│                     │                                       │
│          ┌──────────▼──────────┐                            │
│          │   build_context(db) │  ◄── PostgreSQL queries    │
│          │                     │      (AboutMe, Projects,   │
│          │  Assembles context  │       Tutorials, Products, │
│          │  string from live   │       Freebies, FAQs,      │
│          │  DB records         │       Appointments, etc.)  │
│          └──────────┬──────────┘                            │
│                     │                                       │
│          ┌──────────▼──────────┐                            │
│          │  Google Gemini API  │                            │
│          │  (gemini-flash-     │                            │
│          │   latest)           │                            │
│          │                     │                            │
│          │  System Prompt =    │                            │
│          │  SYSTEM_PROMPT +    │                            │
│          │  WEBSITE CONTEXT    │                            │
│          └──────────┬──────────┘                            │
│                     │                                       │
│          ┌──────────▼──────────┐                            │
│          │  Response Parser    │                            │
│          │                     │                            │
│          │  Detects:           │                            │
│          │  [APPOINTMENT_      │                            │
│          │   REQUEST: ...]     │                            │
│          └──────────┬──────────┘                            │
│                     │                                       │
│        ┌────────────┴────────────┐                          │
│        │                         │                          │
│  ┌─────▼──────┐          ┌───────▼──────┐                   │
│  │ Save Appt  │          │  Log Chat    │                   │
│  │ Send Email │          │  to DB       │                   │
│  │ Create Cal │          │  (if email   │                   │
│  │ Event      │          │   captured)  │                   │
│  │ Schedule   │          └──────────────┘                   │
│  │ Reminders  │                                             │
│  └────────────┘                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **LLM** | Google Gemini (`gemini-flash-latest`) | Language model for response generation |
| **LLM SDK** | `google-generativeai` (Python) | Gemini API client |
| **RAG Strategy** | Custom database context injection | Real-time portfolio data retrieval |
| **Backend Framework** | FastAPI 0.111 | Async API server, `/api/chat` endpoint |
| **ORM** | SQLAlchemy 2.0 | Database abstraction for context queries |
| **Database** | PostgreSQL 16 | Persistent storage for all portfolio data |
| **Calendar** | Google Calendar API (`google-api-python-client`) | Event creation and slot management |
| **Auth (Calendar)** | Google Service Account | Server-to-server Calendar access |
| **Email** | Python `smtplib` + `MIMEMultipart` | SMTP email delivery (Namecheap Private Email) |
| **Async Scheduling** | Python `asyncio` | Non-blocking reminder email scheduling |
| **Frontend Framework** | Next.js 14 (App Router, TypeScript) | Portfolio frontend and chat widget |
| **Styling** | Tailwind CSS | Responsive widget UI |
| **Markdown Rendering** | `react-markdown` | Rich text bot responses |
| **HTTP Client** | Axios | Frontend API requests |
| **Icons** | Lucide React | Chat widget icons |

---

## Conversation Flow

GAB follows a strict 3-turn onboarding sequence for new conversations before switching to open-ended assistance:

```
TURN 1 — GAB greets the visitor
┌─────────────────────────────────────────────────────────────────┐
│ "Hi! I am Gab, Tunji's Personal Assistant 👋                    │
│  How can I help you today?"                                     │
└─────────────────────────────────────────────────────────────────┘

TURN 2 — Visitor sends their first message
         GAB responds with lead capture prompt
┌─────────────────────────────────────────────────────────────────┐
│ "Thank you for reaching out! To make sure Tunji can get back    │
│  to you, kindly type your name, a comma, then your email        │
│  address (e.g. John, john@email.com) — or type your name        │
│  only if you prefer."                                           │
└─────────────────────────────────────────────────────────────────┘

TURN 3 — Visitor provides name (and optionally email)
         GAB greets by first name and opens the conversation
┌─────────────────────────────────────────────────────────────────┐
│ "Hi [FirstName], you are welcome to Tunji's WorkSpace! 😊        │
│  How can I help you today?"                                     │
└─────────────────────────────────────────────────────────────────┘

OPEN — All subsequent turns are driven by visitor intent
       GAB answers from live context or initiates booking flow
```

GAB maintains name and email memory throughout the conversation session and uses the visitor's first name naturally in subsequent messages.

---

## Appointment Booking Pipeline

When a visitor expresses intent to book a meeting, GAB collects the following details conversationally:

| Field | Description |
|---|---|
| `name` | Full name (may already be captured in onboarding) |
| `email` | Email address (may already be captured in onboarding) |
| `phone` | Phone number |
| `date` | Preferred date in `YYYY-MM-DD` format |
| `time` | Preferred time in `HH:MM` format |
| `message` | Purpose or notes for the meeting |

**Slot conflict prevention:** Before suggesting any time slot, GAB reads the `BOOKED APPOINTMENTS` section of the injected context (populated from the live `Appointment` table filtered to non-cancelled records, last 20). It will not offer or confirm any already-booked slot.

Once all details are collected, the Gemini model emits a structured tag in its response:

```
[APPOINTMENT_REQUEST: name="John Doe", email="john@example.com", phone="07700900000", date="2026-04-15", time="10:00", message="Discuss AI consulting project"]
```

The backend parses this tag with a regex, strips it from the displayed response, and triggers the full booking pipeline:

```
1. Save Appointment record to PostgreSQL
2. Send admin notification email (HTML formatted)
3. Create Google Calendar event (1-hour block, attendee invited)
4. Schedule async email reminders: 24h → 10h → 1h before
```

The frontend detects the `appointment_booked: true` flag in the API response and appends a confirmation message to the chat automatically.

---

## Email Automation

All emails are sent via SMTP using Python's `smtplib` with STARTTLS encryption. The system uses Namecheap Private Email (`mail.privateemail.com:587`) as the SMTP server with `Reply-To` set to the admin's Gmail address, so all client replies land in Gmail.

| Email Type | Trigger | Recipient |
|---|---|---|
| **Appointment notification** | New booking confirmed | Admin |
| **Appointment reminder (24h)** | 24 hours before appointment | Admin |
| **Appointment reminder (10h)** | 10 hours before appointment | Admin |
| **Appointment reminder (1h)** | 1 hour before appointment | Admin |
| **Freebie confirmation** | User requests freebie download | Visitor |
| **Freebie download link** | Email confirmed | Visitor |
| **Purchase confirmation** | Stripe payment success | Visitor |
| **Chat log notification** | First chat session logged | Admin |

Reminders are scheduled using `asyncio.sleep()` inside background tasks spawned with `asyncio.create_task()`. Each reminder opens its own SQLAlchemy session to fetch fresh appointment data.

---

## Google Calendar Integration

GAB uses a **Google Service Account** for server-to-server Calendar access — no OAuth consent flow required at booking time.

**Event details created per booking:**
- Title: `📅 Appointment with [Name]`
- Description: client name, email, and meeting purpose
- Duration: 1 hour
- Timezone: `Europe/London`
- Attendees: client email (invite sent automatically via `sendUpdates='all'`)
- Reminders: email reminder 24h before, popup 10 minutes before

Credentials are loaded from either:
- `GOOGLE_CREDENTIALS_JSON` environment variable (inline JSON — preferred for Railway/Docker)
- `GOOGLE_CREDENTIALS_PATH` file path (local development default: `/app/google-credentials.json`)

---

## Lead Capture & Chat Logging

When a visitor provides their name and email during the TURN 2 onboarding step, GAB parses this from the conversation history using a simple pattern match (`name, email@domain.com`). If both are captured, the full chat session (last 10 messages + current exchange) is saved as a `ContactMessage` record in the database tagged with `[CHAT LOG]`.

To prevent duplicate log entries per visitor session, the system checks for an existing `[CHAT LOG]` record with the same email before writing a new one.

A formatted admin notification email is also sent upon first log, giving visibility into new visitor conversations without requiring the admin to check the dashboard.

---

## Admin Controls

GAB exposes the following admin-facing configuration options:

### System Prompt Override
- `GET /api/admin/bot-settings` — Retrieve current custom system prompt
- `PUT /api/admin/bot-settings` — Save a new system prompt

When a custom prompt is set in `BotSettings`, it completely replaces the default `SYSTEM_PROMPT`. The live portfolio context is always appended regardless of which prompt is active.

### Chatbot Avatar
- `PUT /api/admin/site-settings/chatbot_photo/upload` — Upload a custom photo

The frontend fetches the avatar on mount via `GET /api/site-settings/chatbot_photo`. If set, the uploaded image is displayed as the bot's avatar in both the floating toggle button and the chat panel header. If not set, a Lucide `Bot` icon is used as fallback.

### FAQ Quick Prompts
- FAQs managed via the admin FAQ panel are fetched by the chatbot widget at mount time via `GET /api/faqs`
- FAQ questions are displayed as clickable quick-prompt buttons when the chat has just opened
- Static fallback prompts are used if the FAQ endpoint returns no data

---

## Frontend Widget

The chat widget (`ChatBot.tsx`) is mounted globally in the Next.js layout, making it available on every page without per-page configuration.

**Widget anatomy:**

```
┌──────────────────────────────┐
│  [Avatar]  ASK ME   [Close]  │  ← Header (gradient background)
├──────────────────────────────┤
│  Quick prompts (FAQ list)    │  ← Shown only on first open
├──────────────────────────────┤
│                              │
│   [Bot bubble]               │  ← ReactMarkdown rendered
│              [User bubble]   │
│   [Bot bubble]               │
│   [● ● ●] (typing...)        │  ← Animated loading indicator
│                              │
├──────────────────────────────┤
│  [Text input]        [Send]  │  ← Enter key supported
└──────────────────────────────┘
```

**Behaviour:**
- Widget initialises with GAB's opening greeting message on first open (no API call needed — rendered locally)
- Full conversation history (last 10 messages) is sent with each request to maintain multi-turn context
- Appointment booking confirmation is injected as a follow-up bot message 500ms after booking signal is detected
- Auto-scrolls to the latest message on each update
- Fully responsive: `w-80` on mobile, `md:w-96` on tablet and above

---

## API Reference

### `POST /api/chat`

Process a chat message with full RAG context.

**Request body:**
```json
{
  "message": "Tell me about your AI projects",
  "history": [
    { "role": "model", "content": "Hi! I am Gab..." },
    { "role": "user",  "content": "Hello" }
  ]
}
```

**Response:**
```json
{
  "response": "Tunji has worked on several AI/ML projects including...",
  "appointment_booked": false,
  "appointment_data": null
}
```

**Response with booking:**
```json
{
  "response": "Great! I've noted your appointment for April 15th at 10:00 AM...",
  "appointment_booked": true,
  "appointment_data": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "07700900000",
    "date": "2026-04-15",
    "time": "10:00",
    "message": "Discuss AI project"
  }
}
```

**Error response (graceful fallback):**
```json
{
  "response": "I'm having trouble connecting right now. Please try again or use the contact form directly.",
  "appointment_booked": false,
  "appointment_data": null
}
```

---

## Environment Variables

```env
# Google Gemini
GEMINI_API_KEY=your_gemini_api_key

# Google Calendar (use one of the following)
GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}   # Inline JSON (recommended for Railway)
GOOGLE_CREDENTIALS_PATH=/app/google-credentials.json     # File path (local dev)
GOOGLE_CALENDAR_ID=your_calendar_email@gmail.com

# SMTP Email (Namecheap Private Email)
SMTP_HOST=mail.privateemail.com
SMTP_PORT=587
SMTP_USER=info@myworkspace.snipal.uk
SMTP_PASSWORD=your_smtp_password
FROM_EMAIL=info@myworkspace.snipal.uk
ADMIN_EMAIL=tunjiologun@gmail.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

---

## Project Structure

```
myworkspace/
├── backend/
│   └── app/
│       ├── api/
│       │   └── routes.py              # POST /api/chat endpoint
│       ├── services/
│       │   ├── rag_service.py         # Core RAG logic, context builder, email helpers
│       │   └── calendar_service.py    # Google Calendar event creation
│       ├── models/
│       │   └── user.py                # ORM models: BotSettings, FAQ, Appointment, etc.
│       └── core/
│           └── config.py              # Settings (GEMINI_API_KEY, SMTP, Calendar)
│
└── frontend/
    └── src/
        └── components/
            └── chat/
                └── ChatBot.tsx        # React floating chat widget
```

---

## Design Decisions

**Why Google Gemini over OpenAI?**
Gemini Flash offers fast inference and a generous free tier, making it an appropriate choice for a portfolio project where cost efficiency and speed matter. The `google-generativeai` SDK provides a clean multi-turn chat API that maps naturally to the conversation history pattern used here.

**Why no LangChain or LlamaIndex?**
These frameworks add significant abstraction overhead that is unnecessary when your retrieval logic is a set of typed SQLAlchemy queries. The entire context building pipeline is transparent, debuggable Python — no hidden prompt templates, no framework magic, and no dependency bloat.

**Why database retrieval instead of vector similarity search?**
Portfolio data is structured, bounded, and fully known at query time. Vector similarity search would introduce embedding costs, index maintenance, and retrieval uncertainty for no practical benefit. The `build_context()` function returns 100% of relevant data every time, which is exactly what a bounded portfolio assistant needs.

**Why `asyncio.create_task()` for reminders instead of a job queue?**
For a single-server portfolio deployment, async tasks are sufficient and avoid the operational overhead of Celery, Redis, or a separate worker process. The trade-off is that reminders are lost on server restart — an acceptable risk for a low-volume portfolio booking system.

**Why structured tag parsing (`[APPOINTMENT_REQUEST: ...]`) instead of function calling?**
Gemini's function-calling API requires explicit schema definitions and is more complex to maintain. The structured tag approach keeps the extraction logic in plain Python regex and makes the LLM's intent explicit in the raw response text — easier to debug, log, and extend.

---

*Built by **Tunji Ologun** — [MyWorkSpace](https://myworkspace.snipal.uk)*
