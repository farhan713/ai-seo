# Admin guide

For operators managing **AI SEO Tool**: accounts, plans, content generation, and environment.

---

## Access

- **Admin** users sign in at the same app URL; they are redirected to `/admin` (clients use `/dashboard`).  
- Seed creates an admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` (see `prisma/seed.ts`).

---

## Typical admin tasks

| Task | Where |
|------|--------|
| View / manage clients | Admin user list and subscription controls (app-specific admin UI) |
| Run or schedule audits | Admin flows for triggering site audits / AI content where implemented |
| Social drafts (Elite) | Generate daily social ad drafts per user from admin tools |
| Monthly email | Configure `RESEND_*`, `CRON_SECRET`, hit cron with `Authorization: Bearer …` |

---

## Plans and gates

Plan logic is centralized in `lib/plan-access.ts` (audit access, Growth features, Elite social, GA4, shareable reports, ad creative angles, etc.). When changing tiers, update:

- Prisma `Plan` enum and seed data  
- `plan-access.ts`  
- Any UI that shows upgrade messaging  

---

## Integrations (Google)

- **Search Console:** OAuth redirect `{AUTH_URL}/api/integrations/search-console/callback`.  
- **GA4:** Same OAuth client; add `{AUTH_URL}/api/integrations/ga4/callback` and enable **Analytics Data API**; consent screen scope `analytics.readonly`.  

Document these URIs in your Google Cloud OAuth client.

---

## Reporting and QA

- **Shareable reports:** Clients on any plan with audit access use **Share report** to mint expiring public links (`/r/[token]`). Verify `AUTH_URL` (or `NEXT_PUBLIC_APP_URL`) so generated URLs are absolute in production.  
- **Regression:** Run `npm run build` and follow [all-phases test cases](../phases/all-phases-test-cases.md).

---

## Related docs

- [Client credentials and keys](./client-credentials-and-keys.md) — env vs BYOK  
- [Use cases — Starter](./use-cases-starter.md) · [Growth](./use-cases-growth.md) · [Elite](./use-cases-elite.md)  
- Phase specs under `docs/phases/`
