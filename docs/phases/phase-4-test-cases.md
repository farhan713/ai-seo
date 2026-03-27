# Phase 4 — test cases

Run after deploy or before release. Assumes seeded **CLIENT** with **Starter**, **Growth**, and **Elite** accounts where noted.

| ID | Area | Steps | Expected |
|----|------|--------|----------|
| P4.1 | F1 Growth score | Log in (any plan with audit). Open **Overview**. | **Unified growth score** card shows 0–100; **Why this score?** expands with band breakdown. |
| P4.2 | F1 Formula | One audit only vs two+ audits; toggle checklist items. | Score updates; momentum text references second audit when two runs exist. |
| P4.3 | F4 Limits | Starter: add competitor until cap. Growth: add up to 3. | API/UI enforce caps; duplicate URL rejected. |
| P4.4 | F4 Refresh | Add URL → **Refresh snapshot** twice. | Second run shows **diff** for title/meta/H1 when changed; first run stores baseline only. |
| P4.5 | F4 Block own URL | Add your **business URL** as competitor. | POST returns error. |
| P4.6 | F12 Landing blocks | Run **new** Site audit (GEMINI set). | **Lead magnet landing blocks** section with headline, bullets, CTA, form intro; copy buttons work. |
| P4.7 | F14 Social proof | Single audit vs two audits with different Lighthouse/opportunity. | With one audit: prompt to run again. With two: lines only if deltas exist. |
| P4.8 | F2 Opt-in Starter | Starter user opens Business profile. | Monthly email checkbox hidden; note says Growth/Elite. |
| P4.9 | F2 Opt-in Growth | Growth user toggles opt-in, saves. | `monthlyExecutiveReportOptIn` true in DB/API GET profile. |
| P4.10 | F2 Cron auth | `curl` cron URL without secret. | `401`. With `Authorization: Bearer $CRON_SECRET`, `200` and JSON summary (may send 0 if Resend missing). |
| P4.11 | F2 Resend | Set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, opt-in Growth user, force `lastMonthlyReportSentAt` null or old, hit cron. | Email received; `lastMonthlyReportSentAt` updated. |
| P4.12 | F2 Elite PDF | Elite opt-in; cron with Resend. | Email includes **monthly-growth-brief.pdf** attachment. |
| P4.13 | Build | `npm run build` | Completes with no type/lint errors. |

**Env for F2:** `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `AUTH_URL` (or `NEXT_PUBLIC_APP_URL`) for dashboard links in email.
