# Deploy to Netlify (testers / staging)

The repo includes **`netlify.toml`**, **`@netlify/plugin-nextjs`**, and **`npm run build:netlify`** (Prisma + `next build` without Turbopack for reliable CI).

---

## Drag-and-drop a “build” folder — not supported for this app

Netlify’s **manual deploy** (upload a folder in the UI) only hosts **static** assets. This app is **Next.js with serverless API routes**, **Prisma**, and **NextAuth**. There is **no** `out/` or `dist/` folder you can drop that will make login, audits, or the database work.

**Closest alternative without Git:** use **Netlify CLI** from your laptop — see **`NETLIFY-DEPLOY.txt`** in the repo root and **“Deploy without Git (CLI)”** below.

---

## Deploy without Git (CLI)

From the project directory (after `npm install`):

1. `npm run netlify:login` — browser login to Netlify.
2. `npm run netlify:link` — link to an existing Netlify site (create the site in the Netlify UI first if needed).
3. Set **environment variables** in the Netlify UI (same list as §3 below).
4. `npm run netlify:deploy` — runs **`netlify deploy --build --prod`** (uses `netlify.toml` + `build:netlify`).

Preview deploy (branch/PR-style URL): `npm run netlify:deploy:draft`

Uses pinned `netlify-cli` via `npx` (no need to install the CLI globally).

---

## 1. Prerequisites

- **Git** repo pushed to GitHub / GitLab / Bitbucket.
- **PostgreSQL** reachable from the internet (Supabase, Neon, Railway, etc.).
- **Netlify** account ([netlify.com](https://www.netlify.com)).

---

## 2. Create the site

1. Netlify → **Add new site** → **Import an existing project**.
2. Pick the repo and branch (e.g. `main`).
3. Netlify should detect **Next.js** and read **`netlify.toml`**:
   - **Build command:** `npm run build:netlify`
   - **Node:** 20 (set in `netlify.toml`)

Do **not** override the build command to `npm run build` unless you remove `--turbopack` from the default build locally; **`build:netlify`** is the supported command for Netlify.

---

## 3. Environment variables (Site → Environment variables)

Set at least:

| Variable | Example / notes |
|----------|------------------|
| `AUTH_URL` | `https://YOUR-SITE.netlify.app` — **no trailing slash** |
| `AUTH_SECRET` | Same as local: `openssl rand -base64 32` |
| `DATABASE_URL` | Pooler URL if using Supabase PgBouncer |
| `DIRECT_URL` | Direct Postgres URL (migrations / Prisma) |
| `GEMINI_API_KEY` | For audits, blogs, campaign ideas (or testers use BYOK in app) |
| `PAGESPEED_INSIGHTS_API_KEY` | Optional; Lighthouse in audits |

Optional (feature-dependent):

| Variable | When |
|----------|------|
| `GOOGLE_SEARCH_CONSOLE_CLIENT_ID` / `SECRET` | GSC + GA4 OAuth — add redirect URIs using **same** `AUTH_URL` |
| `NEXT_PUBLIC_APP_URL` | Same as `AUTH_URL` if you want public share links / emails to use it |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET` | Monthly email + cron |

After the first deploy, copy the live URL and **update `AUTH_URL`** (and Google OAuth redirect URIs) if Netlify assigned a different hostname.

---

## 4. Database schema on production

Netlify **does not** run `prisma db push` automatically. From your machine (or CI), with **production** `DATABASE_URL`:

```bash
npx prisma migrate deploy
```

If you use **`db push`** instead of migrations:

```bash
npx prisma db push
```

Then seed or create admin users as you do locally (`npx prisma db seed` or your process).

---

## 5. Google OAuth (testers using GSC / GA4)

In Google Cloud Console → OAuth client → **Authorized redirect URIs**, add:

- `https://YOUR-SITE.netlify.app/api/integrations/search-console/callback`
- `https://YOUR-SITE.netlify.app/api/integrations/ga4/callback`

Use **exact** `AUTH_URL` host (HTTPS).

---

## 6. Limits and timeouts

- **Serverless** functions have a **default time limit** (often 10s on free tier, configurable on paid). Long **site audits** or **PageSpeed** may need a higher limit or a background job in production.
- If audits fail with timeout, increase **Functions → Function timeout** in Netlify or simplify test URLs.

---

## 7. Verify

1. Open `https://YOUR-SITE.netlify.app/login`
2. Log in as seeded admin/client.
3. Run a **small** site audit on a fast URL to confirm DB + Gemini.

---

## 8. Prisma on Netlify

`schema.prisma` includes `binaryTargets = ["native", "rhel-openssl-3.0.x"]` so the client runs on Netlify’s Linux build and runtime.

---

## Related

- [Client credentials / keys](../guides/client-credentials-and-keys.md)
- [Netlify Next.js docs](https://docs.netlify.com/frameworks/next-js/overview/)
