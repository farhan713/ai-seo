# Phase 4 — Scale & differentiation

**Status:** **Done** (shipped in codebase).  
**Theme:** One **growth narrative**, **competitor rhythm**, **landing/social proof copy**, and **automated monthly reporting**.

**Prerequisites:** Phase 2 (data) and Phase 3 (execution) recommended so scores and reports have substance.

---

## Goal

The product feels like a **managed growth program**: clients see a single score trajectory, competitors do not slip past unnoticed, and stakeholders get **monthly proof** without logging in.

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

## Deliverables (shipped)

### F1 — Unified growth score

- [x] Overview widget with expandable **Why this score** breakdown (`components/growth-score-card.tsx`, `lib/growth-score.ts`)
- [x] Formula **v1** documented in `lib/growth-score.ts` (see `GROWTH_SCORE_FORMULA_VERSION`)

### F4 — Competitor watchlist

- [x] `CompetitorWatch` model + CRUD + refresh snapshot (`/dashboard/competitors`, `/api/competitors`, `/api/competitors/[id]`, `/api/competitors/[id]/refresh`)
- [x] Plan limits: Starter **1**, Growth **3**, Elite **5** (`competitorWatchlistLimit`)

### F12 — Lead magnet & landing copy blocks

- [x] `landingLeadMagnet` on audit deliverables (Gemini + `clampDeliverables`) and copy UI on Site audit

### F14 — Social proof kit

- [x] `buildSocialProofLines` — only when first vs latest audits produce measurable deltas (`lib/social-proof-kit.ts`, Site audit page banner)

### F2 — Monthly executive email / PDF

- [x] Opt-in on **Business profile** (`monthlyExecutiveReportOptIn`) for **Growth/Elite** only
- [x] Cron route `GET /api/cron/monthly-report` (Bearer `CRON_SECRET`) + Resend HTML email
- [x] Elite: PDF attachment via `pdfkit` (`lib/monthly-report-pdf.ts`)
- [x] `vercel.json` schedule: first of month 09:00 UTC

---

## Testing

See [phase-4-test-cases.md](./phase-4-test-cases.md) and run `npm run build`.

---

## Out of scope (unchanged)

- Paid media depth — Phase 5  
- Shareable read-only client report (F19) — Phase 5 unless reprioritized  
