# All phases — consolidated test cases

Single checklist for regression after releases. Deeper detail lives in phase-specific files: [phase-3-test-cases.md](./phase-3-test-cases.md), [phase-4-test-cases.md](./phase-4-test-cases.md), [phase-0-plus-phase-2-flows-by-plan.md](./phase-0-plus-phase-2-flows-by-plan.md).

**Assumptions:** Seeded admin + clients (Starter, Growth, Elite); `GEMINI_API_KEY` set unless testing BYOK-only users.

---

## Phase 0 — Presets & profile

| ID | Case | Steps | Expected |
|----|------|--------|----------|
| A0.1 | Register | New client signup | Account + can open Business profile |
| A0.2 | Presets persist | Change vertical/goal, save | Reload shows values; audits mention context |
| A0.3 | Admin edit | Admin updates client profile | Client sees updated presets |

---

## Phase 2 — GSC, keywords, F18

| ID | Case | Steps | Expected |
|----|------|--------|----------|
| A2.1 | GSC 401 | `GET /api/integrations/search-console` no session | `401` |
| A2.2 | GSC 403 | Client without subscription | `403` |
| A2.3 | Tracked keywords | CRUD on `/dashboard/keywords` | Plan limits enforced |
| A2.4 | Audit progress | 0 / 1 / 2+ audits | Card empty / prompt / deltas per `AuditProgressCard` |

---

## Phase 3 — Calendar, checklist, social packs, audit blocks

| ID | Case | Steps | Expected |
|----|------|--------|----------|
| A3.1 | Calendar cap | Starter: 3rd item | Blocked or error |
| A3.2 | Checklist | Toggle task, PATCH | Persists per URL |
| A3.3 | Social pack | Starter audit captions | LinkedIn only |
| A3.4 | Social pack | Growth audit/blog | Three platforms |
| A3.5 | Lead blocks | New audit with Gemini | CTA/FAQ/lead magnet sections |

*(See [phase-3-test-cases.md](./phase-3-test-cases.md) for full tables.)*

---

## Phase 4 — Growth score, competitors, monthly email

| ID | Case | Steps | Expected |
|----|------|--------|----------|
| A4.1 | Growth score | Overview | 0–100 + expandable rationale |
| A4.2 | Competitor cap / diff | Add URLs, refresh | Limits + diff when data changes |
| A4.3 | Monthly opt-in | Growth toggles, Starter | Growth saves; Starter UI hidden |
| A4.4 | Cron | Bearer without/with secret | `401` / `200` |

*(See [phase-4-test-cases.md](./phase-4-test-cases.md).)*

---

## Phase 5 — GA4, local/ad audit packs, share links, BYOK

| ID | Case | Steps | Expected |
|----|------|--------|----------|
| A5.1 | GA4 gate | Starter opens `/dashboard/analytics` | Upgrade / not allowed message |
| A5.2 | GA4 allow | Growth: GET `/api/integrations/ga4` | `200`, `oauthConfigured` boolean |
| A5.3 | GA4 connect | Connect Google → save Property ID → sync | Summary or clear `lastSyncError` |
| A5.4 | GA4 disconnect | DELETE integration | Row removed; UI reset |
| A5.5 | Local SEO pack | Profile: toggle on + local-ish preset → audit | `localSeoPack` sections when `shouldIncludeLocalSeoPack` |
| A5.6 | Ad angles | Elite audit | Ad creative angles panel |
| A5.7 | Ad angles gate | Growth audit | No ad angles section |
| A5.8 | Share report | Any plan with audit: POST `/api/report-shares` | `publicUrl`, row in GET list |
| A5.9 | Public report | Open `/r/[token]` incognito | Read-only snapshot; no login |
| A5.10 | Revoke | DELETE `/api/report-shares/[id]` | Link stops working |
| A5.11 | BYOK Gemini | Save key on Business profile; optional unset server key scenario | Audit uses user key when configured |
| A5.12 | BYOK PageSpeed | Save PageSpeed key | Lighthouse uses override |
| A5.13 | Remove BYOK | Check remove + save | `hasGeminiKey` false on GET profile |
| A5.14 | Tooltips | Settings + Social ads | `?` shows numbered steps |

---

## Build

| ID | Expected |
|----|----------|
| B1 | `npm run build` passes |
| B2 | `npx prisma validate` passes |

---

## Key routes (reference)

| Area | Routes |
|------|--------|
| Profile / BYOK | `GET/PATCH /api/user/profile` |
| GA4 | `/api/integrations/ga4`, `authorize`, `callback`, `sync` |
| Share | `GET/POST /api/report-shares`, `DELETE /api/report-shares/[id]`, `GET /r/[token]` |
| Social creds | `PATCH /api/user/social` |
