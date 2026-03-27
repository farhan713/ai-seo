# Phase 3 — Execution (weekly workflows)

**Status:** **Done** (shipped in codebase).  
**Theme:** Turn audits into **repeatable work**: content schedule, on-page tasks, social distribution, and lead-focused copy.

**Prerequisite:** Phase 0 **done**. Phase 2 **recommended** (GSC/keywords/before-after) before or alongside early Phase 3 items; Phase 0 presets already improve output quality.

---

## Goal

Clients know **what to publish**, **what to fix per URL**, **what to post on social**, and **how to capture leads** — without leaving the product for spreadsheets.

---

## Features in this phase

| ID | Feature |
|----|---------|
| **F8** | Content calendar from pillars |
| **F9** | On-page checklist per URL |
| **F11** | Platform-specific social post packs |
| **F15** | CTA & form recommendations |
| **F16** | FAQ & objection blocks |
| **F17** | Lead capture audit section |

---

## Planning

### Execution order (recommended)

1. **F9** — Checklists tied to existing audit/crawl URLs (high reuse of current data).  
2. **F15, F16, F17** — Extend audit deliverables + dashboard section (Gemini + structured JSON).  
3. **F11** — Generate post variants from blog/audit (tier by plan).  
4. **F8** — Calendar UI + storage, optionally seeded from audit `contentPillarIdeas`.

---

### F8 — Content calendar from pillars

**User stories**

- As a **client**, I turn pillar ideas into dated items (title, channel, status).

**Technical notes**

- `ContentCalendarItem` (`userId`, `title`, `brief`, `dueDate`, `status`, `sourceAuditId` optional).  
- Growth+: full calendar; Starter: read-only sample or 2-item cap.

**Deliverables**

- [x] List/board UI + API (`/dashboard/calendar`, `/api/calendar-items`)  
- [x] “Add from audit” (seed from `contentPillarIdeas`)  

---

### F9 — On-page checklist per URL

**User stories**

- As a **client**, I open a URL and see tasks (title, meta, H1, schema, speed, internal links) with checkboxes.

**Technical notes**

- Link to `SiteAudit` / `CrawlPage` id; store `ChecklistState` JSON per user+url or per audit snapshot.  
- Pre-fill from latest audit findings where possible.

**Deliverables**

- [x] Page picker + checklist (`/dashboard/on-page-checklist`, `/api/on-page-checklist`)  
- [x] Persist progress per URL  

---

### F11 — Social post packs

**User stories**

- As a **client**, I get LinkedIn / Instagram / Facebook captions from a blog or audit summary.

**Technical notes**

- Gemini prompt with platform constraints; store as part of blog or separate `SocialPack` entity.  
- Plan limits: Starter 1 platform, Growth 2–3, Elite all.

**Deliverables**

- [x] UI on blog detail (Growth+) + generate from each audit run  
- [x] Copy-friendly output (`/api/social-post-pack`)  

---

### F15 — CTA & form recommendations

**User stories**

- As a **client**, I see primary/secondary CTA suggestions per main URL or site-wide.

**Technical notes**

- [x] Added to `AuditDeliverables` + Gemini JSON; shown on Site audit page.

---

### F16 — FAQ & objection blocks

**User stories**

- As a **client**, I get paste-ready FAQ Q&A and objection handlers for service pages.

**Technical notes**

- [x] Structured JSON from audit pipeline; shown with copy actions.

---

### F17 — Lead capture audit section

**User stories**

- As a **client**, I see a scored review of forms, trust signals, mobile CTA visibility.

**Technical notes**

- [x] AI subsection in deliverables: score 0–100, summary, pass/warn/fail items.

---

## Dependencies

- **F3** presets improve F11/F16 tone  
- Existing **audit** and **blog** pipelines for generation  
- Optional **crawl** data for multi-URL checklists  

---

## Completion checklist

- [x] F9  
- [x] F15, F16, F17 (audit upgrade)  
- [x] F11  
- [x] F8  

**Tests:** [phase-3-test-cases.md](./phase-3-test-cases.md)

---

## Out of scope

- Growth composite dashboard (**F1**) — Phase 4  
- GSC/GA4 — Phase 2 (already)  
