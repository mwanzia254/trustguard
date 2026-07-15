# ScamChek — Fraud & Scam Verification Platform

Kenya's community platform to expose scammers, fake accounts, and online fraud.

**Trust · Verify · Report**

## What ScamChek Does

ScamChek lets you check any phone number, M-Pesa till/paybill, TikTok handle, social media account, or business name to see if they have been reported for:

- 💰 Payment fraud & M-Pesa scams
- 👤 Fake accounts & catfishing
- 💔 Romance scams
- 🪪 Identity theft & impersonation
- 📦 Fake products & non-delivery
- 💼 Fake jobs & investment fraud
- 🛍️ Fake businesses & ghost shops

## Technology Stack

| Layer | Technology |
|---|---|
| Web Frontend | React 18 + TypeScript + Tailwind CSS |
| State | Zustand + TanStack React Query |
| Database | Supabase PostgreSQL (with Row Level Security) |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage (evidence files) |
| Search | Supabase ilike + Levenshtein fuzzy matching (browser) |
| AI Engine | Browser-based NLP — no external AI APIs |
| Hosting | Netlify / Vercel (frontend) |
| Mobile | Capacitor (Android) |

## Setup

```bash
# Frontend
cd trustguard/frontend
npm install
cp .env.example .env
# Add Supabase credentials
npm run dev
```

Run SQL migrations in Supabase SQL Editor:
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rpc_functions.sql`
- `supabase/migrations/003_add_tiktok.sql`
- `supabase/migrations/004_mpesa_validation.sql`
- `supabase/migrations/005_scammer_graph.sql`
- `supabase/migrations/006_extend_categories.sql`

## App ID
- Package: `co.ke.scamchek`
- Version: 1.0.0
