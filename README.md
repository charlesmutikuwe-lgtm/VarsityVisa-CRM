# Varsity Visa CRM

A full-stack student pipeline and lead management system built with **Next.js 14 + Supabase**.

---

## Features

| Module | Status |
|---|---|
| 🔐 Authentication (Supabase Auth) | ✅ Built |
| 📋 Study Match Lead Capture Form | ✅ Built |
| 📊 Admin Dashboard with Charts | ✅ Built |
| 🗃️ Leads Table with Search/Filter | ✅ Built |
| 🔁 Kanban Pipeline (Drag & Drop) | ✅ Built |
| 🤖 AI Lead Scoring (GPT-4o) | ✅ Built |
| 📱 WhatsApp Integration | ✅ Placeholder (Twilio/Meta ready) |
| 📄 Document Tracking | ✅ Built |
| 📝 Activity Log & Notes | ✅ Built |

---

## Setup

### 1. Clone and Install

```bash
git clone <your-repo>
cd varsity-visa-crm
npm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL** and **anon key** from Settings → API
3. Copy your **service role key** (keep this secret)

### 3. Run Database Migration

In your Supabase dashboard, go to **SQL Editor** and paste the contents of:
```
supabase/migrations/001_initial.sql
```
Run it. This creates all tables, RLS policies, and triggers.

### 4. Configure Environment

```bash
cp .env.example .env.local
```
Fill in your values:
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — your service role key (server only)
- `OPENAI_API_KEY` — from [platform.openai.com](https://platform.openai.com)
- `INTERNAL_API_KEY` — any random string (e.g. `openssl rand -hex 32`)

### 5. Create Admin User

1. Go to Supabase → Authentication → Add User
2. Create your admin email/password
3. In SQL Editor, run:
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
```

### 6. Run Development Server

```bash
npm run dev
```

- **Lead Capture Form** → `http://localhost:3000/`
- **Admin Login** → `http://localhost:3000/login`
- **Dashboard** → `http://localhost:3000/dashboard`

---

## Project Structure

```
varsity-visa-crm/
├── app/
│   ├── page.tsx                    ← Public Study Match form
│   ├── (auth)/login/               ← Admin login
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← Sidebar navigation
│   │   ├── dashboard/              ← Stats + charts
│   │   ├── leads/                  ← Lead table + filters
│   │   ├── pipeline/               ← Kanban board
│   │   └── students/               ← Enrolled students view
│   ├── api/
│   │   ├── leads/route.ts          ← Lead CRUD + rule scoring
│   │   ├── ai-score/route.ts       ← GPT-4o deep scoring
│   │   └── whatsapp/route.ts       ← WhatsApp messaging
│   └── globals.css                 ← Design system
├── lib/
│   ├── supabase.ts                 ← All DB queries
│   └── ai-scoring.ts              ← Scoring engine
├── types/index.ts                  ← TypeScript types
└── supabase/migrations/001.sql     ← Database schema
```

---

## AI Lead Scoring

Leads are scored on 4 dimensions (0–25 each = 100 total):

| Dimension | What it measures |
|---|---|
| **Budget Fit** | Budget vs destination cost |
| **Timeline Urgency** | Months until intended start |
| **Document Readiness** | Passport, transcripts, IELTS, financials |
| **Engagement Level** | WhatsApp opt-in, source quality, contact history |

On form submit: **instant rule-based score** (no API delay).  
In background: **GPT-4o deep analysis** with consultant reasoning.

---

## WhatsApp Integration

Set `WHATSAPP_PROVIDER` in `.env.local`:

| Value | Description |
|---|---|
| `placeholder` | Logs only, no actual sending |
| `twilio` | Twilio WhatsApp Business (easiest to set up) |
| `meta` | Meta Cloud API (official, free after approval) |

Templates in `app/api/whatsapp/route.ts` — `WHATSAPP_TEMPLATES`:
- Welcome message
- Follow-up nudge
- Document reminder
- Visa approval congratulations
- Appointment reminder

---

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Add all `.env.local` variables to Vercel's environment settings.

### Custom Domain

Update `NEXT_PUBLIC_APP_URL` to your production domain.

---

## Phase 2 Roadmap

- [ ] Automated email nurturing sequences
- [ ] Appointment booking integration
- [ ] Document upload portal
- [ ] WhatsApp chatbot (AI-powered)
- [ ] Student portal with visa tracking
- [ ] Referral programme tracking
- [ ] Scholarship database integration

---

Built for Varsity Visa Zimbabwe 🇿🇼

---

## Varsity Visa Operational Upgrade Applied

This package now includes the CRM fixes recommended after reviewing the first Claude-generated version.

### Main changes

- Added Varsity Visa's real destination set: Poland, Lithuania, Dubai/UAE, Malaysia, India, Romania, Hungary, Turkey and Georgia, while retaining UK, Canada, Australia, USA, Germany, New Zealand and South Africa.
- Added additional pipeline stages: consultation booked, documents pending, offer received, fees paid, deferred and dropped out.
- Added stricter lead validation for full name, email and phone number to reduce fake form submissions.
- Improved Zimbabwe-specific AI scoring logic so low-cost destinations are not unfairly scored like premium destinations.
- Added separate operational tables for `students`, `documents` and `payments`.
- Added indexes for follow-ups, destination reporting, source reporting, document status and payment status.
- Added migration file: `supabase/migrations/002_varsity_visa_operational_upgrade.sql` for projects that already ran the first schema.
- Added shared constants in `lib/constants.ts` so destinations and pipeline labels stay consistent across the public form, dashboard, leads table and pipeline board.

### Which SQL should you run?

If you have not yet created the Supabase database, run:

```sql
supabase/migrations/001_initial.sql
```

If you already ran the older first schema, run:

```sql
supabase/migrations/002_varsity_visa_operational_upgrade.sql
```

### Important note

The new `documents`, `payments` and `students` tables are now available in the database layer. The current UI still mainly uses the lead pipeline. The next build phase should add detailed screens for document verification, payment tracking and individual student profiles.
