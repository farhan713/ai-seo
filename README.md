# SEO Content SaaS (MVP)

Multi-tenant MVP where clients on an **SEO_CONTENT** plan receive AI-generated blogs (three per week by default), view and copy HTML in the dashboard, and track directory backlink submissions. Admins manage users and subscriptions manually (no payments in this phase).

## Stack

- Next.js 15 (App Router), TypeScript, Tailwind CSS v4
- Prisma 6 + PostgreSQL (**same env pattern as Roar Data**: `DATABASE_URL` + `DIRECT_URL` for Supabase pooler + direct)
- NextAuth.js v5 (credentials)
- Google Gemini (blog generation in **Next.js** admin API and **Python** cron agent)

## Prerequisites

- Node.js 20+
- PostgreSQL database (e.g. Supabase)
- Gemini API key
- Python 3.11+ (for `agents/` cron jobs on a VPS)

## Setup

1. **Clone and install**

   ```bash
   cd aiseotool
   npm install
   ```

2. **Environment**

   ```bash
   cp .env.example .env
   ```

   Set **`DATABASE_URL`** and **`DIRECT_URL`** like Roar Data / Supabase: pooled connection for the app, direct (port 5432) for migrations and tooling. If you only have one connection string (e.g. Neon), use the **same value for both**.

   Also set `AUTH_SECRET` (e.g. `openssl rand -base64 32`), `AUTH_URL` (production URL when deployed), `GEMINI_API_KEY`, and `ADMIN_EMAIL` / `ADMIN_PASSWORD` (plus optional `CLIENT_*` for the demo client seed).

3. **Database**

   ```bash
   npx prisma db push
   npm run db:seed
   ```

   The seed script upserts the admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Re-run whenever you change the admin password.

4. **Run the app**

   ```bash
   npm run dev
   ```

   - Sign in as admin at `/login` with the seeded account.
   - Clients register at `/register`, then you assign an **ACTIVE** `SEO_CONTENT` subscription under **Admin → Subscriptions**.
   - When a subscription becomes **ACTIVE**, default backlink rows are created for that user.

## Roles and routes

| Role   | Area |
|--------|------|
| CLIENT | `/dashboard`, `/dashboard/blogs`, `/dashboard/backlinks` |
| ADMIN  | `/admin`, users, subscriptions, manual blog generation |

## API (selected)

- `POST /api/auth/[...nextauth]` — NextAuth
- `POST /api/register` — client registration
- `GET/PATCH /api/blogs`, `GET/PATCH /api/blogs/[id]` — client blogs
- `GET/PATCH /api/backlinks`, `PATCH /api/backlinks/[id]` — client checklist
- `GET /api/admin/users` — admin: client list
- `PATCH /api/admin/users/[id]` — admin: profile / active flag
- `POST /api/admin/subscriptions` — create or update subscription
- `POST /api/admin/generate` — admin: one Gemini blog for a user (respects weekly cap + active sub)

## Blog body format

Posts store `body` as JSON blocks: `{ "type": "h2" \| "p" \| "ul" \| "callout", ... }` with `text` or `content` as described in the Gemini prompt. The dashboard renders them to HTML and **Copy HTML** wraps content in `<article><h1>…</h1>…</article>`.

## Python cron agent (`agents/`)

Runs on a VPS on a schedule (e.g. weekly or daily) to fill weekly quotas.

```bash
cd agents
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python blog_agent.py
```

Uses **`DIRECT_URL`** if set, otherwise **`DATABASE_URL`**, and **`GEMINI_API_KEY`** (loads `.env` from the **project root** via `agents/config.py`, same rule as Roar Data’s `seo-agent`).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run db:push` | Push schema to DB |
| `npm run db:seed` | Seed admin user |

## Production notes

- Set `AUTH_URL` to your public origin.
- Use a strong `AUTH_SECRET`.
- Ensure Supabase / Postgres allows connections from your app host and optionally from the VPS running the Python agent.
