# Deploy on a VPS (full app + secrets on your server)

You can run the **entire** Next.js app on your own server (DigitalOcean, Hetzner, AWS EC2, etc.). All API keys live in a **`.env` file on the VPS** (or Docker `env_file`) — **never commit** `.env` to Git.

---

## What you get

- Same product as local: dashboards, API routes, Prisma, OAuth callbacks, cron-capable routes.
- **You** control firewall, backups, and who can SSH.
- Point **`AUTH_URL`** at `https://your-domain.com` and add the same URLs to Google OAuth redirect list.

---

## Option A — Docker (recommended)

### 1. On the VPS

Install [Docker](https://docs.docker.com/engine/install/) and Docker Compose plugin.

### 2. Copy the project

```bash
git clone <your-repo> aiseotool && cd aiseotool
```

### 3. Create `.env` on the server

```bash
cp .env.example .env
nano .env   # or vim
chmod 600 .env
```

Fill **all** variables you use locally (`AUTH_URL`, `AUTH_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `GEMINI_API_KEY`, Google OAuth, Resend, etc.).  
**`AUTH_URL`** must be the **public HTTPS URL** users open (no trailing slash).

### 4. Database schema (once per environment)

From the same folder (needs `DATABASE_URL` / `DIRECT_URL` in `.env`):

```bash
npm ci
npx prisma migrate deploy
# or: npx prisma db push
npx prisma db seed   # optional
```

(You can run this on the VPS before Docker, or from your laptop pointed at the production DB.)

### 5. Build and run containers

```bash
docker compose build
docker compose up -d
```

App listens on **port 3000**. Put **Nginx** or **Caddy** in front for HTTPS (below).

### 6. Google OAuth

Add redirect URIs (replace domain):

- `https://your-domain.com/api/integrations/search-console/callback`
- `https://your-domain.com/api/integrations/ga4/callback`

---

## Option B — Node directly (no Docker)

On Ubuntu 22.04+ with Node 20:

```bash
git clone <repo> aiseotool && cd aiseotool
cp .env.example .env && chmod 600 .env && nano .env
npm ci
npx prisma migrate deploy
npm run build:netlify
```

Run with **systemd** or **PM2**:

```bash
# PM2 example
npm install -g pm2
pm2 start npm --name aiseotool -- start
pm2 save && pm2 startup
```

`npm start` runs `next start` on port 3000 (set `PORT` in `.env` if needed).

---

## HTTPS reverse proxy (Nginx sketch)

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Issue certs with **Certbot** (`certbot --nginx`).

---

## Security checklist

| Do | Don’t |
|----|--------|
| `chmod 600 .env` | Push `.env` to Git |
| Firewall: only 22, 80, 443 public | Expose Postgres `5432` to the world |
| Strong `AUTH_SECRET` | Reuse dev secrets in production |
| Regular OS + Docker updates | Store keys in the Docker image layers (use `env_file` / runtime env) |

---

## Optional Postgres on the same VPS

See commented **`db`** service in `docker-compose.yml`. If you enable it, set in `.env`:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db:5432/aiseotool?schema=public
DIRECT_URL=postgresql://postgres:YOUR_PASSWORD@db:5432/aiseotool?schema=public
```

Add `depends_on: [db]` under `app` if you use the bundled Postgres.

---

## Monthly cron (Elite/Growth email)

Call your deployed URL with the secret header, e.g.:

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/monthly-report
```

Add a **cron** line on the VPS or an external scheduler.

---

## Files in this repo

| File | Role |
|------|------|
| `Dockerfile` | Multi-stage build: `npm ci` → `prisma generate` → `build:netlify` → standalone runtime |
| `docker-compose.yml` | Runs `app` on port 3000 with `env_file: .env` |
| `next.config.ts` | `output: "standalone"` for a small production bundle |

---

## Related

- [`.env.example`](../../.env.example) — variable list  
- [Netlify / other hosting](./netlify.md)  
- [Client credentials](../guides/client-credentials-and-keys.md)
