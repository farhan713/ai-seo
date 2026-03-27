# Deploy on Vercel

Your **`.env` stays on your machine**. For Vercel, you **copy each key** into **Project → Settings → Environment Variables** (Production / Preview as needed). Never commit `.env`.

---

## 1. Prerequisites

- Code on **GitHub**, **GitLab**, or **Bitbucket** (Vercel imports from Git).
- A **PostgreSQL** database (Vercel Postgres, **Neon**, **Supabase**, **Railway**, etc.) with `DATABASE_URL` and usually `DIRECT_URL` (pooler vs direct — same as local).

---

## 2. Create the Vercel project

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. **Import** your `aiseotool` repository.
3. **Framework Preset:** Next.js (auto).
4. **Build Command:** leave default — the repo’s **`vercel.json`** sets  
   `prisma generate && next build` (no Turbopack, reliable on Vercel).
5. **Install Command:** `npm install` (default).
6. **Output:** Next.js default (no change).

---

## 3. Environment variables

In **Settings → Environment Variables**, add the **same names** as your local `.env`. Minimum for the app to work:

| Name | Notes |
|------|--------|
| `AUTH_URL` | After first deploy, set to your Vercel URL, e.g. `https://your-app.vercel.app` (no trailing slash). Redeploy after changing. |
| `AUTH_SECRET` | Paste the same value as local (or generate a new one with `openssl rand -base64 32` for production-only). |
| `DATABASE_URL` | Production DB (pooler URL if you use PgBouncer — e.g. Supabase port 6543). |
| `DIRECT_URL` | Direct Postgres URL for Prisma migrations / some queries (e.g. Supabase 5432). |

Add any others you use locally, for example:

`GEMINI_API_KEY`, `PAGESPEED_INSIGHTS_API_KEY`, `GOOGLE_SEARCH_CONSOLE_CLIENT_ID`, `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL` (optional, same as public site URL for share links).

Apply to **Production** (and **Preview** if you want preview deployments to work with a DB).

---

## 4. First deploy

Click **Deploy**. If the build fails, open the build log; common fixes:

- **Prisma:** ensure `DATABASE_URL` is set for the build if you run migrations in build (optional below).
- **Missing env:** add the variable Vercel reports.

---

## 5. Database schema on production

After the first successful deploy (or before, from your laptop with **production** `DATABASE_URL`):

```bash
# From your project folder, with production DATABASE_URL in env or inline:
npx prisma migrate deploy
```

If you use **`db push`** instead of migrations:

```bash
npx prisma db push
```

Optional seed for testers:

```bash
npx prisma db seed
```

---

## 6. Fix `AUTH_URL` and redeploy

1. Copy your live URL from Vercel (e.g. `https://aiseotool-xxx.vercel.app`).
2. Set **`AUTH_URL`** to that exact URL (HTTPS, no `/` at the end).
3. **Redeploy** (Deployments → … → Redeploy).

---

## 7. Google OAuth (Search Console / GA4)

In Google Cloud Console → OAuth client → **Authorized redirect URIs**, add:

- `https://YOUR-VERCEL-URL.vercel.app/api/integrations/search-console/callback`
- `https://YOUR-VERCEL-URL.vercel.app/api/integrations/ga4/callback`

Use the same host as **`AUTH_URL`**.

---

## 8. Custom domain (optional)

**Settings → Domains** → add `app.yourdomain.com`, then set **`AUTH_URL`** to `https://app.yourdomain.com` and update Google redirect URIs.

---

## Repo files used on Vercel

| File | Role |
|------|------|
| `vercel.json` | `buildCommand`: `prisma generate && next build` |
| `next.config.ts` | Skips `output: 'standalone'` when `VERCEL` is set |

---

## Related

- [Options for testers](./options-for-testers.md)  
- [`.env.example`](../../.env.example) — full variable list
