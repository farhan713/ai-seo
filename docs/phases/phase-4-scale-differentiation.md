# Phase 4 — Scale & differentiation

**Status:** **Done** (see [phase-4-execution.md](./phase-4-execution.md))  
**Theme:** One **growth narrative**, **competitor rhythm**, **assets for landing/social proof**, and **automated reporting**.

**Prerequisites:** Phase 2 (data) and Phase 3 (execution) strongly recommended so scores and reports have substance.

---

## Goal

The product feels like a **managed growth program**: clients see a single score trajectory, competitors don’t slip past unnoticed, and stakeholders get **monthly proof** without logging in.

---

## Features in this phase

| ID | Feature |
|----|---------|
| **F1** | Unified growth score dashboard |
| **F4** | Competitor watchlist (light) |
| **F12** | Lead magnet & landing copy blocks |
| **F14** | Social proof kit |
| **F2** | Monthly executive email / PDF |

---

## Planning

### Execution order (recommended)

1. **F1** — Define formula v1 (weights from Lighthouse, audit severity, keyword trend placeholder, content cadence).  
2. **F14** — Quick win: templated strings from stored metrics (Lighthouse delta, issue count delta).  
3. **F4** — Scheduled job comparing competitor URLs (reuse fetch/snapshot patterns).  
4. **F12** — New deliverable type or generator from audit + industry.  
5. **F2** — Email first (simpler); PDF second (branding, charts).

---

### F1 — Unified growth score

**User stories**

- As a **client**, I see one score 0–100 and what moved it this month.

**Technical notes**

- Version the formula (`growthScoreVersion`) in DB or config.  
- Inputs: latest vs previous audit aggregates, optional GSC trend, checklist completion %, blog count (if Growth).

**Deliverables**

- [x] `/dashboard` or dedicated widget  
- [x] “Why this score” expandable breakdown  

**Definition of done**

- [x] Document formula in code comment + this doc appendix when frozen (`lib/growth-score.ts`, v1)  

---

### F4 — Competitor watchlist

**User stories**

- As a **client**, I add 2–3 competitor URLs and get a monthly (or weekly) diff of homepage signals.

**Technical notes**

- Reuse `fetchPageSignalsForAudit`-style job; store `CompetitorSnapshot` per URL per run.  
- Email digest optional tie-in with F2.

**Deliverables**

- [x] CRUD for competitor URLs + plan limits  
- [x] Diff UI (title, meta, H1 count changes)  

---

### F12 — Lead magnet & landing copy blocks

**User stories**

- As a **client**, I get sections for a landing page: headline, subhead, bullets, CTA, form intro.

**Technical notes**

- Gemini from audit + `marketingGoal`; output structured blocks with copy buttons.

---

### F14 — Social proof kit

**User stories**

- As a **client**, I get 3–5 post lines quoting measurable improvements (where data exists).

**Technical notes**

- Template + guardrails: only generate claims when before/after numbers exist (F18).

---

### F2 — Monthly executive email / PDF

**User stories**

- As a **client**, I receive a monthly summary of audits, score, keywords, and next steps.

**Technical notes**

- Cron/worker (Vercel cron + serverless or external scheduler).  
- Resend/SES; unsubscribe link.  
- PDF: `@react-pdf` or HTML→PDF service for Elite branding.

**Deliverables**

- [x] Opt-in toggle per user  
- [x] Growth: email; Elite: + PDF logo  

---

## Dependencies

- **F18** (Phase 2) for honest F14  
- **F6/F5** (Phase 2) for richer F1 and F2  
- Email provider + cron hosting  

---

## Completion checklist

- [x] F1 v1  
- [x] F14  
- [x] F4  
- [x] F12  
- [x] F2 email  
- [x] F2 PDF (Elite scope)  

---

## Out of scope

- Paid media deep workflows — Phase 5  
- Shareable public links — Phase 5 (or here if prioritized)  
