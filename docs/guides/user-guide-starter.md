# User guide — Starter plan (₹499/mo)

This guide explains **every feature** you can use on Starter: where it lives, how to use it, what you gain, and what makes it different from higher tiers.

---

## What makes Starter unique

- **Lowest cost** way to get AI-assisted **site audits**, **Search Console** alignment, **keyword tracking**, and a **content calendar** with a small cap.
- **One competitor** and **two calendar slots** teach discipline; upgrade to Growth when you need blogs, GA4, and heavier content volume.
- **LinkedIn-only** social captions from audits (Growth adds Instagram and Facebook on blogs and audits).

---

## Before you start

1. **Register** and **log in** — you land on **Overview**.
2. Open **Business profile** (`/dashboard/settings`) and fill:
   - **Business name, website, description** — used everywhere AI writes for you.
   - **Industry vertical** and **marketing goal** — tune audit and copy to your business model (e.g. SaaS vs local services).
   - **Target keywords** — feed the keyword tracker and prompts.
   - **Internal links (JSON)** — optional list of important URLs for internal linking hints.
3. **Optional API keys** (same page): **Gemini** and **PageSpeed** — use the **?** tooltips for step-by-step setup. If you skip them, the app uses the server’s keys when configured.
4. **Local SEO pack** — turn on if you care about Google Business Profile–style drafts in audits (works best with local vertical/goal).

**Benefit:** Better first audit and fewer generic suggestions.

---

## Overview (`/dashboard`)

- **Growth score** (when you have audit data): a single 0–100-style view with a short explanation of what moved the score.
- **Audit progress** (when you have two or more audits): compares early vs latest Lighthouse-style signals.

**How to use:** Glance weekly after new audits.

**Unique value:** One place to see “are we moving?” without spreadsheets.

---

## Business profile (`/dashboard/settings`)

Already covered in “Before you start.”

**Benefit:** Every AI feature respects your real business context.

**Starter note:** You will **not** see the monthly executive email opt-in (Growth/Elite only).

---

## Site audit (`/dashboard/audit`)

**What it does:** Fetches your page, runs technical checks (including Lighthouse/PageSpeed when keys exist), and asks Gemini for structured recommendations: keywords, meta, CTAs, FAQs, lead-capture ideas, social caption pack (**LinkedIn only** on Starter), and more.

**How to use:**

1. Ensure **website URL** is correct in Business profile.
2. Click run / generate (per your UI).
3. Read sections and use **Copy** buttons to paste into your CMS or docs.

**Benefit:** Actionable, brand-aware audit in minutes—not a generic PDF.

**Starter vs Growth:** Growth gets **three platforms** in the social pack from the same audit. **Elite** adds **ad creative angles** (Meta/Google-style headlines)—not on Starter.

---

## Site crawl (`/dashboard/site-crawl`)

**What it does:** Crawls links starting from your site (within limits) to surface structural/technical notes.

**How to use:** Start a crawl from your homepage or key URL; review results when complete.

**Benefit:** Catches issues beyond a single URL audit.

---

## Search performance (`/dashboard/search-performance`)

**What it does:** Connects **Google Search Console** (OAuth). Syncs recent query data for the property that matches your site.

**How to use:**

1. **Connect Google** and complete OAuth.
2. Use **Sync** when you want fresh data.
3. Review queries and clicks in the UI.

**Benefit:** See what people actually search before you change titles and content.

**Requires:** Google Cloud OAuth client configured on the server (`GOOGLE_SEARCH_CONSOLE_*`).

---

## Keywords (`/dashboard/keywords`)

**What it does:** Tracks phrases you care about; can align with GSC data when connected.

**How to use:** Add phrases manually; export if the UI offers CSV.

**Starter limit:** Up to **10** tracked keywords.

**Benefit:** Single list of priorities tied to measurement when GSC is on.

---

## Content calendar (`/dashboard/calendar`)

**What it does:** Plan topics and dates; can be seeded from audit **content pillar** ideas where available.

**How to use:** Add items, change status, delete when done.

**Starter limit:** **2** items total—third is blocked.

**Benefit:** Lightweight planning without paying for Growth volume.

**Upgrade trigger:** When you need a full editorial calendar, move to Growth.

---

## On-page checklist (`/dashboard/on-page-checklist`)

**What it does:** Per-URL checklist (titles, headings, schema, etc.) with checkboxes that save for that URL.

**How to use:** Enter or select URL → load checklist → tick items as you fix them.

**Benefit:** Repeatable QA so pages don’t regress.

---

## Competitors (`/dashboard/competitors`)

**What it does:** Add competitor URLs, store snapshots, refresh to see title/meta/H1 **diffs**.

**How to use:** Add **one** URL (Starter cap). Use **Refresh** after they change their site.

**Benefit:** Quick competitive intelligence without a separate tool.

**Starter limit:** **1** competitor. You **cannot** add your own domain.

---

## Share report (`/dashboard/share-report`)

**What it does:** Creates a **time-limited public link** (`/r/...`) anyone can open without logging in—snapshot of growth score and audit summary style info.

**How to use:** Choose expiry days → **Generate** → copy link → share with a stakeholder → **Revoke** when done.

**Benefit:** Client-safe reporting without sharing passwords.

**Requires:** `AUTH_URL` or `NEXT_PUBLIC_APP_URL` set in production so links are absolute.

---

## What Starter does *not* include

| Feature | Where it unlocks |
|---------|------------------|
| AI **Blogs** | Growth |
| **Backlinks** checklist | Growth |
| **Web analytics (GA4)** | Growth |
| **Campaign ideas** (trend/holiday hooks) | Growth |
| **Social ads** page + Meta drafts | Elite |
| **Ad creative angles** in audit | Elite |
| Monthly **executive email** opt-in | Growth |

---

## Troubleshooting (Starter)

| Symptom | Check |
|---------|--------|
| Audit errors on AI | `GEMINI_API_KEY` on server or your **Business profile** Gemini key |
| No Lighthouse scores | `PAGESPEED_INSIGHTS_API_KEY` or your PageSpeed BYOK |
| GSC won’t connect | OAuth redirect URI and Search Console API enabled in Google Cloud |
| Calendar won’t add item #3 | Expected on Starter—upgrade or delete an item |

---

## Next step

- [User guide — Growth](./user-guide-growth.md) if you upgrade.  
- [QA checklist — full product](./qa-full-product-test-cases.md) for testers.  
- [Client credentials](./client-credentials-and-keys.md) for keys.
