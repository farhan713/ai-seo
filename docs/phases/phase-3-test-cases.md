# Phase 3 — Test cases (Execution)

Use after deploying Phase 3. Assumes `GEMINI_API_KEY` is set for audits, social packs, and extended deliverables.

---

## F9 — On-page checklist

| # | Case | Steps | Expected |
|---|------|--------|----------|
| T9.1 | GET without auth | `GET /api/on-page-checklist?url=https://example.com` (no cookie) | `401` |
| T9.2 | GET without url | Authenticated client, missing `url` query | `400` |
| T9.3 | First load | Open `/dashboard/on-page-checklist` with business URL set | Default tasks shown; can toggle checkboxes |
| T9.4 | PATCH persists | Toggle a task | `200`, reload page or `GET` same url shows `persisted: true` |
| T9.5 | Different URLs | Save checklist for URL A, change URL to B, Load | Distinct progress per URL key |

---

## F8 — Content calendar

| # | Case | Steps | Expected |
|---|------|--------|----------|
| T8.1 | Starter cap | Starter plan, create 2 items, try third | `403` or error on limit |
| T8.2 | Growth capacity | Growth plan, many items | Allowed up to high limit (500) |
| T8.3 | Seed from audit | Run audit with `contentPillarIdeas`, click seed on calendar | New rows with pillar titles |
| T8.4 | PATCH status | Change item to DONE | Persists in list |
| T8.5 | DELETE | Remove item | Gone from GET list |

---

## F11 — Social post pack

| # | Case | Steps | Expected |
|---|------|--------|----------|
| T11.1 | Blog — Growth | Growth user, blog detail, Generate | `linkedin`, `instagram`, `facebook` populated |
| T11.2 | Blog — Starter | Starter user opens blog | No social pack UI on blog (Growth+ only) |
| T11.3 | Audit — Starter | Starter user, Site audit, Generate captions on a run | Only LinkedIn text (others empty) |
| T11.4 | Audit — Growth | Growth user, same | Three platforms populated |
| T11.5 | Missing key | Unset `GEMINI_API_KEY`, generate | Error surfaced in UI / `502` or message from API |

---

## F15 / F16 / F17 — Audit deliverables

| # | Case | Steps | Expected |
|---|------|--------|----------|
| TX.1 | New audit shape | Run fresh Site audit | Sidebar shows CTA/forms, FAQ blocks, objections, lead capture score |
| TX.2 | Legacy audit | Open old audit JSON without new keys | `clampDeliverables` on client fills defaults; sections still render |
| TX.3 | Copy actions | FAQ “Copy” buttons | Clipboard receives Q/A text |

---

## Build / regression

| # | Case | Expected |
|---|------|----------|
| B1 | `npm run build` | Passes |
| B2 | `npx prisma validate` | Valid schema |

---

## Related routes

| Feature | Route |
|---------|--------|
| Calendar | `GET/POST /api/calendar-items`, `PATCH/DELETE /api/calendar-items/[id]` |
| Checklist | `GET/POST/PATCH /api/on-page-checklist` |
| Social pack | `POST /api/social-post-pack` (`blogId` or `auditId`) |
