# Phase 5 — Elite, paid media & polish

**Status:** **Shipped** (MVP: GA4 OAuth + property ID + sync, audit deliverables for local + ad angles, tokenized `/r/[token]`, BYOK keys on profile).  
**Theme:** **GA4** context, **ad creative** depth, **local SEO**, and **shareable reports** for agencies and serious clients.

**Prerequisites:** Phases 2–4 for full value; can start **F19** earlier if sales need it.

---

## Goal

Elite tier delivers **full-funnel visibility** (search + site + ads), **local playbook** where relevant, and **client-facing reports** without sharing passwords.

---

## Features in this phase

| ID | Feature |
|----|---------|
| **F7** | GA4 connect |
| **F13** | Ad creative angles (Meta / Google) |
| **F10** | Local SEO pack |
| **F19** | Shareable read-only client report |

---

## Planning

### Execution order (recommended)

1. **F19** — High sales impact; tokenized public links, read-only view of selected widgets.  
2. **F7** — GA4 Data API; property picker; basic traffic/conversion summary on dashboard.  
3. **F13** — Headline/body variants from audit gaps + industry; tie to existing Meta token story if present.  
4. **F10** — GBP-oriented copy, service-area, review response snippets; gate by `marketingGoal === LOCAL` or Elite flag.

---

### F7 — GA4 connect

**User stories**

- As a **client**, I connect GA4 and see sessions, key events, and top landing pages next to SEO metrics.

**Technical notes**

- OAuth or service account (property-level); store encrypted refresh token.  
- Respect GA4 quotas; cache daily aggregates in `AnalyticsDailySummary`.

**Deliverables**

- [x] Connect UI + property ID + sync (`/dashboard/analytics`)  
- [x] Disconnect + data deletion  

**Definition of done**

- [x] Connecting Google user needs access to the GA4 property; scope `analytics.readonly` documented in `.env.example`  

---

### F13 — Ad creative angles

**User stories**

- As an **Elite** client, I get Meta/PMax-style headline and description variants tied to audit themes.

**Technical notes**

- Extend Gemini deliverables; optional export CSV for editor upload.  
- Align character limits with Meta/Google specs.

---

### F10 — Local SEO pack

**User stories**

- As a **local** business client, I get GBP post drafts, Q&A ideas, and NAP/review guidance.

**Technical notes**

- Trigger when industry preset is local or user enables “local mode.”  
- Do not scrape GBP without API; generate **drafts** only.

---

### F19 — Shareable read-only client report

**User stories**

- As a **client**, I generate a link my boss can open without an account (expires in N days).

**Technical notes**

- `ReportShare` token (`token`, `userId`, `expiresAt`, `snapshotJson` or server-rendered snapshot id).  
- Public route `/r/[token]` with minimal branding.  
- Rate limit + no index headers.

**Deliverables**

- [x] Create/revoke link UI (`/dashboard/share-report`, `/r/[token]`)  
- [ ] Optional password on link (v2)  

---

## Dependencies

- Google Cloud: GA4 Data API enabled  
- **F1/F2** make share reports compelling  
- Meta app (existing) for any future “push to ads” — out of scope unless you expand  

---

## Completion checklist

- [x] F19  
- [x] F7  
- [x] F13  
- [x] F10  

---

## Optional follow-ups (post Phase 5)

- OAuth **Search Ads** / Meta Marketing API for live campaign push (high compliance burden).  
- White-label domain for **F19**.  
- Team seats and agency parent account.  
