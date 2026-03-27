# Client credentials and API keys

This app can run with **server-side** secrets only, or clients can add **their own keys (BYOK)** where the UI allows it. This document lists what may be required from **your team (hosting)** vs **optional client entry**.

---

## Operator / server (`.env`)

| Variable | Used for | Required when |
|----------|----------|----------------|
| `AUTH_URL` / `AUTH_SECRET` | Auth, OAuth redirects | Always |
| `DATABASE_URL` / `DIRECT_URL` | Prisma | Always |
| `GEMINI_API_KEY` | Audits, blogs, social packs, ad angles | Unless every user supplies BYOK Gemini (not recommended) |
| `PAGESPEED_INSIGHTS_API_KEY` | Lighthouse in Site audit | Unless users add BYOK PageSpeed keys |
| `GOOGLE_SEARCH_CONSOLE_CLIENT_ID` / `SECRET` | GSC + **GA4** OAuth (same client; two redirect URIs) | GSC or GA4 features |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Monthly executive email | F2 email |
| `CRON_SECRET` | Securing `/api/cron/monthly-report` | F2 cron |

See [`.env.example`](../../.env.example) for comments and placeholders.

---

## Client dashboard (stored per user)

| Location | Field | Purpose |
|----------|--------|---------|
| **Business profile** | Gemini API key (optional) | Overrides server `GEMINI_API_KEY` for that user’s audits when set |
| **Business profile** | PageSpeed API key (optional) | Overrides server key for that user’s Lighthouse calls |
| **Business profile** | Local SEO pack toggle | Lets audits include local/GBP-style drafts when profile fits local intent |
| **Social ads (Elite)** | Credentials JSON | Meta Page token + Instagram Business Account id (see tooltip on that page) |
| **Web analytics** | GA4 Property ID | After Google OAuth; numeric ID from GA4 Admin |
| **Search performance** | (OAuth only) | No manual key; user connects Google |

BYOK keys are merged in `User.clientProvidedKeys` (JSON). The API never returns raw key values to the client; only flags like `hasGeminiKey`.

---

## How clients get keys (summary)

Step-by-step hints also appear in the **?** tooltips next to each field in the product.

1. **Gemini** — [Google AI Studio](https://aistudio.google.com/apikey) → Create API key.  
2. **PageSpeed** — Google Cloud Console → enable PageSpeed Insights API → Credentials → API key.  
3. **GA4 Property ID** — Analytics → Admin → Property settings → copy numeric Property ID (after connecting Google).  
4. **Meta** — Developers / Business Suite; long-lived Page token and Instagram Business Account ID (see Social ads page tooltip).

---

## Security notes

- Treat all tokens as secrets; rotate if exposed.  
- Production should **encrypt** `socialCredentials` and OAuth refresh tokens at rest (MVP may store plaintext—harden before wide rollout).  
- Restrict Google API keys by API and HTTP referrer in Cloud Console where possible.
