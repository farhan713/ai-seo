# Ways to put the app online for testers

This stack is **Next.js 15 + API routes + Prisma + PostgreSQL**. Any host must support a **Node server** (or your **Docker** image), not static hosting alone.

| Approach | Effort | Good for testers | Notes |
|----------|--------|------------------|--------|
| **[Vercel](https://vercel.com)** | Low | Yes | See **[vercel.md](./vercel.md)**. Repo includes **`vercel.json`** build command + Prisma. |
| **[Railway](https://railway.app)** | Low | Yes | New project → deploy from Git **or** deploy this repo’s **Dockerfile**. Add **PostgreSQL** plugin; paste connection strings into variables. Very quick for demos. |
| **[Render](https://render.com)** | Low | Yes | **Web Service** (Node or Docker) + **PostgreSQL** instance. Set build/start commands and env vars. Free tier can sleep (cold starts). |
| **[Fly.io](https://fly.io)** | Medium | Yes | `fly launch` with existing **Dockerfile**. Attach **Fly Postgres** or external DB. Full container; good control. |
| **[Google Cloud Run](https://cloud.google.com/run)** | Medium | Yes | Build and push the **Docker** image; set env vars; connect **Cloud SQL** or external Postgres. Pay per request. |
| **[DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)** | Low–medium | Yes | Git → detect Node or Docker; add **managed DB** or use Supabase. |
| **Netlify** | Low | Yes | Already configured (`netlify.toml`, `build:netlify`). Git **or** `npm run netlify:deploy`. See [netlify.md](./netlify.md). |
| **Your VPS + Docker** | Medium | Yes | Full control; all secrets in `.env`. See [vps.md](./vps.md). |

---

## What every option needs

1. **`AUTH_URL`** — public `https://…` base URL (no trailing slash).  
2. **`AUTH_SECRET`** — random string.  
3. **`DATABASE_URL`** (+ **`DIRECT_URL`** if you use a pooler like Supabase).  
4. **`GEMINI_API_KEY`** (and other keys) for features you want testers to try.  
5. **Schema on production DB:** `npx prisma migrate deploy` or `db push` (from CI or your laptop).  
6. **Google OAuth:** redirect URIs must use the **live** `AUTH_URL` host.

---

## Quick picks

- **Fastest “Next.js native”:** **Vercel** + Neon/Supabase Postgres.  
- **Fastest “one bill, DB included”:** **Railway** or **Render**.  
- **Same as local production:** **Docker** on **VPS** or **Fly.io** / **Cloud Run**.  
- **Already in repo:** **Netlify** (Git or CLI) · **Docker** ([vps.md](./vps.md)).

---

## Not a fit (by themselves)

- **Static hosting** (S3, Netlify Drop, GitHub Pages) — no server for APIs/auth/Prisma.  
- **Shared PHP cPanel** only — need Node (or only Docker if host allows it).
