# Phase 2 — Close the loop (trust & measurement)

**Status:** **Shipped** — **F18**, **F6**, and **F5** (tracked keywords + GSC matching + auto-seed from profile, audit pillars, and GSC) are implemented. Optional hardening: encrypt GSC refresh tokens at rest.

**Theme:** Prove impact with real data and historical “before/after,” not only scores.

**Original dependency note:** **F5b** (join tracked keywords with GSC) would follow **F5a** + **F6**; only **F6** is required for automated query import.

---

## Goal

Clients see **queries/clicks** (where possible), **tracked keywords**, and **progress since first audit** so SEO work feels measurable and defensible.

---

## Features in this phase

| ID | Feature | Notes |
|----|---------|--------|
| **F6** | Search Console connect | OAuth; store tokens; fetch queries/pages |
| **F5** | Keyword & topic tracker | Manual + CSV first; enrich with GSC when F6 done |
| **F18** | Before/after snapshots | Extend audit/Lighthouse history story |

---

## Planning

### Execution order (recommended)

1. **F18** — Leverage existing `SiteAudit` / Lighthouse JSON; minimal new schema.  
2. **F5 (manual)** — `TrackedKeyword` (or similar) + UI to add terms + last checked value (manual or simple API).  
3. **F6** — Google Search Console OAuth, link property to `businessUrl` host, sync job.  
4. **F5 (GSC)** — Join tracker rows with GSC query data where query matches.

---

### F18 — Before/after snapshots

**User stories**

- As a **client**, I see “since first audit” or “since last month” for key lab/on-page metrics.

**Technical notes**

- Use earliest `SiteAudit` for user vs latest; compare `lighthouse` (dual or legacy), `pageSnapshot` fields, optional `opportunityIndex` from deliverables.
- Dashboard widget or audit page strip.

**Deliverables**

- [x] Comparison component + data helper (`buildAuditProgressCompare`, `AuditProgressCard`)  
- [x] Copy for empty state (single audit only)

**Definition of done**

- [x] Clear labels; handles legacy single-device Lighthouse  
- [x] No PII; URL is already client’s  

---

### F5 — Keyword & topic tracker

**User stories**

- As a **client**, I maintain a list of target keywords and see status/trend over time.

**Technical notes**

- Tables: `TrackedKeyword` (`userId`, `phrase`, `note`, `createdAt`), optional `KeywordSnapshot` (`keywordId`, `source`, `position`, `capturedAt`, `url`).
- Phase 2a: manual position entry or “checked on” date only.  
- Phase 2b: populate from GSC when F6 live.

**Deliverables**

- [x] CRUD UI + API routes (`/dashboard/keywords`, `/api/tracked-keywords`)  
- [x] Plan limits: Starter 10 · Growth 50 · Elite 100 (`lib/tracked-keyword-limit.ts`)

**Definition of done**

- [x] Export CSV (client download from Keywords page)  
- [x] Duplicate phrases blocked per user (`phraseKey` unique)  
- [x] Auto-seed from `targetKeywords`, `industry`, `businessName`, vertical label, latest audit `contentPillarIdeas`, top GSC queries (within limit)  

---

### F6 — Search Console connect

**User stories**

- As a **client**, I connect Google account and pick a Search Console property aligned with my site.

**Technical notes**

- OAuth 2.0, refresh tokens encrypted at rest.  
- Background job: pull last 28d queries/pages (quota-aware).  
- Match property to user `businessUrl` host with clear UX when mismatch.

**Deliverables**

- [x] Connect / disconnect UI (`/dashboard/search-performance`)  
- [ ] Token encryption at rest (optional hardening — tokens stored as text today)  
- [x] Read-only scope: `webmasters.readonly`  

**Definition of done**

- [x] Disconnect wipes tokens and query rows  
- [x] Error states for wrong property / OAuth failures (redirect query params + `lastSyncError`)  

---

## Dependencies

- Google Cloud project: OAuth consent + Search Console API  
- **F6** unlocks GSC-backed **F5**  
- **F18** can ship without F6  

---

## Completion checklist

- [x] F18 complete  
- [x] F5 complete (manual + auto + GSC match)  
- [x] F6 complete  
- [x] F5 + GSC integration complete (matched stats on Keywords page)  

**See also:** [Phase 0 + Phase 2 flows by plan](./phase-0-plus-phase-2-flows-by-plan.md) (Mermaid + test matrix).

---

## Out of scope (defer to Phase 3+)

- GA4 (**F7**) — can move here if you want one “analytics” phase; otherwise Phase 5 notes  
- Content calendar (**F8**) — Phase 3  
