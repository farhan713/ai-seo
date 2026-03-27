# Phase 0 — Industry & goal presets

**Status:** **Shipped (F3)** — see [phase-0-user-flow.md](./phase-0-user-flow.md) for the user flowchart.  
**Theme:** Configuration and copy defaults so every other phase behaves correctly per client type.  
**Can run:** In parallel with any phase; ideally before heavy Phase 3 content/social work.

---

## Goal

Clients pick an **industry vertical** and **primary goal** (e.g. leads, e‑commerce, awareness). The app adjusts audit emphasis, deliverable tone, social angles, and dashboard copy without one-size-fits-all noise.

---

## Features in this phase

| ID | Feature | Scope |
|----|---------|--------|
| **F3** | Goal & industry presets | All plans |

---

## Planning

### F3 — Goal & industry presets

**User stories**

- As a **client**, I select industry + goal on onboarding or settings so audits and packs read relevant.
- As an **admin**, I can set or override presets per user.

**Technical notes**

- Extend `User` (or profile JSON) with: `industryVertical` (enum or string), `marketingGoal` (enum: `LEADS` | `ECOMMERCE` | `AWARENESS` | `LOCAL` | `SAAS` — adjust to product).
- Thread values into: Gemini prompts (`site-audit`, blog, social), optional dashboard microcopy.
- Seed sensible defaults for existing users (`UNKNOWN` / `GENERAL`).

**Deliverables**

- [ ] Prisma migration + types
- [ ] Client settings UI (or register flow fields)
- [ ] Admin user edit (if admin panel exists)
- [ ] Prompt variable injection in audit + blog paths (minimum: audit)

**Definition of done**

- [ ] New user can set preset; audit text reflects vertical where applicable
- [ ] Existing users have safe default; no breaking API
- [ ] Document allowed enum values in this file or `README`

**Suggested order**

1. Schema + enum  
2. Admin + client UI  
3. Wire `site-audit` (and one other surface, e.g. blog)  
4. QA with 2 verticals side by side  

---

## Dependencies

- None blocking. Optional: align with Phase 2 GSC property domain later.

---

## Out of scope (this phase)

- New data pipelines (GSC/GA4) — Phase 2  
- New dashboards — Phase 4  

---

## Completion checklist

- [x] F3 shipped and verified (build + `prisma db push`)  
- [x] User flow documented in `phase-0-user-flow.md`  
