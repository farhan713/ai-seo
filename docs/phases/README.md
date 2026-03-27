# Product roadmap — phases

Execute in order **Phase 0 → Phase 2 → Phase 3 → Phase 4 → Phase 5**. Phases **0** through **5** are **implemented**; use [all-phases-test-cases.md](./all-phases-test-cases.md) for rolled-up QA.

## Phase status (rolled up)

| Phase | Status | Notes |
|-------|--------|--------|
| **0** | **Done** | F3 presets, register, `/dashboard/settings`, admin edit, audit + blog prompts |
| **2** | **Done** | **F18**, **F6**, **F5** (auto-seeded keywords + GSC match + limits) — see [phase-2-close-the-loop.md](./phase-2-close-the-loop.md) |
| **3** | **Done** | Execution: calendar, checklist, social packs, audit CTA/FAQ/lead ([phase-3-execution.md](./phase-3-execution.md)) |
| **4** | **Done** | Scale & differentiation ([phase-4-execution.md](./phase-4-execution.md)) |
| **5** | **Done** | GA4, local/ad audit packs, shareable reports ([phase-5-elite-paid-media.md](./phase-5-elite-paid-media.md)) |

| Phase | File | Theme |
|-------|------|--------|
| 0 | [phase-0-industry-presets.md](./phase-0-industry-presets.md) · [phase-0-user-flow.md](./phase-0-user-flow.md) | Defaults & presets **done** + user flowchart |
| 2 | [phase-2-close-the-loop.md](./phase-2-close-the-loop.md) | Data, trust, measurement (**done** — F5, F6, F18) |
| 3 | [phase-3-execution.md](./phase-3-execution.md) | Weekly workflows, content, social, leads (**done**) |
| 4 | [phase-4-scale-differentiation.md](./phase-4-scale-differentiation.md) · [phase-4-execution.md](./phase-4-execution.md) | Growth score, competitor watch, reporting |
| 5 | [phase-5-elite-paid-media.md](./phase-5-elite-paid-media.md) | Elite, ads depth, local, shareable reports |

## Guides (clients & operators)

| Doc | Audience |
|-----|----------|
| [guides/README.md](../guides/README.md) | **Index** of all guides |
| [User-Guide-Starter.docx](../client-guide/User-Guide-Starter.docx) | Starter — Word (`npm run docs:user-guides-docx`) |
| [User-Guide-Growth.docx](../client-guide/User-Guide-Growth.docx) | Growth — Word |
| [User-Guide-Elite.docx](../client-guide/User-Guide-Elite.docx) | Elite — Word |
| [QA-Full-Product-Test-Matrix.docx](../client-guide/QA-Full-Product-Test-Matrix.docx) | QA — Word |
| [user-guide-starter.md](../guides/user-guide-starter.md) | Starter — Markdown (optional) |
| [user-guide-growth.md](../guides/user-guide-growth.md) | Growth — Markdown (optional) |
| [user-guide-elite.md](../guides/user-guide-elite.md) | Elite — Markdown (optional) |
| [qa-full-product-test-cases.md](../guides/qa-full-product-test-cases.md) | QA — Markdown (optional) |
| [all-phases-test-cases.md](./all-phases-test-cases.md) | Technical cross-phase checks |
| [use-cases-starter.md](../guides/use-cases-starter.md) | Starter — short journeys |
| [use-cases-growth.md](../guides/use-cases-growth.md) | Growth — short journeys |
| [use-cases-elite.md](../guides/use-cases-elite.md) | Elite — short journeys |
| [admin-guide.md](../guides/admin-guide.md) | Operators |
| [client-credentials-and-keys.md](../guides/client-credentials-and-keys.md) | Env + BYOK reference |

## Feature ID legend (cross-phase)

| ID | Feature | Status |
|----|---------|--------|
| F1 | Unified growth score dashboard | **Done** |
| F2 | Monthly executive email / PDF | **Done** (Growth email, Elite + PDF; Resend + cron) |
| **F3** | **Goal & industry presets** | **Done** |
| F4 | Competitor watchlist (light) | **Done** |
| F5 | Keyword & topic tracker | **Done** (auto-seed + manual CRUD + GSC match) |
| F6 | Search Console connect | **Done** (OAuth + sync + UI) |
| F7 | GA4 connect | **Done** |
| F8 | Content calendar from pillars | **Done** |
| F9 | On-page checklist per URL | **Done** |
| F10 | Local SEO pack | **Done** |
| F11 | Platform-specific social post packs | **Done** |
| F12 | Lead magnet & landing copy blocks | **Done** (audit deliverables) |
| F13 | Ad creative angles (Meta/Google) | **Done** |
| F14 | Social proof kit | **Done** |
| F15 | CTA & form recommendations | **Done** (Site audit deliverables) |
| F16 | FAQ & objection blocks | **Done** |
| F17 | Lead capture audit section | **Done** |
| F18 | Before/after snapshots | **Done** (dashboard: first vs latest audit) |
| F19 | Shareable read-only client report | **Done** |

Mark each **F#** complete in the phase file when shipped (UI + data + empty states + plan limits).
