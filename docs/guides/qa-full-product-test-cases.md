# Full product QA — test cases by user type

Use this checklist **after** `npm run build` passes. Log in as each persona and tick scenarios. Assumes `.env` has database, auth, and (where noted) `GEMINI_API_KEY`, Google OAuth, `RESEND_API_KEY`, etc.

**Demo accounts** (from `prisma/seed.ts` if you use default portfolio seeds):

| Plan | Email | Notes |
|------|--------|--------|
| Starter | `groottechnologies@guest.seoapp` | Password in seed file |
| Growth | `roardata@guest.seoapp` | |
| Elite | `oakwooduae@guest.seoapp` | |
| Admin | `ADMIN_EMAIL` from `.env` | `/admin` routes |

If your database was not seeded with these users, create three clients with **Admin → Users / Subscriptions** (or direct DB) and assign `STARTER_499`, `GROWTH_899`, `ELITE_1599`.

---

## A. Starter client — must work

| # | Area | Steps | Pass criteria |
|---|------|--------|----------------|
| S1 | Login | `/login` | Lands on `/dashboard` |
| S2 | Overview | Open Overview | Growth score card if audits exist; nav matches Starter (no Blogs, Analytics, Campaign ideas if strictly Starter-only nav) |
| S3 | Business profile | Edit vertical, goal, URL, keywords, internal links JSON | Save succeeds; tooltips visible on API key fields |
| S4 | BYOK (optional) | Add/clear Gemini or PageSpeed key | Save; run audit still works with server or user key |
| S5 | Local SEO toggle | Toggle local SEO pack, save | Persists after refresh |
| S6 | Site audit | Run audit on `businessUrl` | Deliverables: CTA, FAQ, lead blocks, Lighthouse section |
| S7 | Site crawl | Start crawl | Completes or shows expected errors for bad URL |
| S8 | Search performance | Connect Google (if OAuth configured) | Sync or clear error message |
| S9 | Keywords | Add phrase, export if shown | Cap **10** phrases enforced |
| S10 | Content calendar | Add 2 items, try third | Third blocked or 403 (Starter cap **2**) |
| S11 | On-page checklist | Pick URL, toggle tasks | Persists on reload |
| S12 | Competitors | Add 1 URL, refresh snapshot | Cap **1**; cannot add own domain |
| S13 | Social post pack (audit) | Generate from audit | **LinkedIn only** captions |
| S14 | Share report | Create link, open in private window | `/r/[token]` read-only; revoke works |
| S15 | Blogs URL | Open `/dashboard/blogs` directly (not in Starter sidebar) | Page may load with empty list; blog **generation** remains Growth+ in admin/API |
| S16 | Negative | Open `/dashboard/campaign-ideas` as Starter | Redirect to dashboard |
| S17 | GA4 URL | Open `/dashboard/analytics` as Starter | Upgrade message (no redirect); API sync remains Growth+ |

---

## B. Growth client — Starter + Growth-only

| # | Area | Steps | Pass criteria |
|---|------|--------|----------------|
| G1 | Nav | Sidebar | **Blogs**, **Backlinks**, **Web analytics**, **Campaign ideas** present |
| G2 | Blogs | Open list, open draft, generate if available | Blog uses presets |
| G3 | Social pack (blog) | Generate social pack on blog | **LinkedIn + Instagram + Facebook** |
| G4 | Backlinks | View checklist, mark items | Persists |
| G5 | Calendar | Add many items | Well above Starter cap (500 limit) |
| G6 | Keywords | Add phrases | Cap **50** |
| G7 | Competitors | Add up to **3** | Fourth rejected |
| G8 | GA4 | `/dashboard/analytics` | Connect flow or “upgrade” if mis-assigned; Property ID + Sync |
| G9 | Campaign ideas | Optional focus text → Generate | 4 ideas returned; no “Create draft” button (Growth) |
| G10 | Monthly email | Business profile opt-in | Checkbox visible; save (needs Resend for real send) |
| G11 | Negative | `/dashboard/social` | Elite-only message or redirect |
| G12 | Audit | Run audit | **No** “Ad creative angles” section |

---

## C. Elite client — full client surface

| # | Area | Steps | Pass criteria |
|---|------|--------|----------------|
| E1 | Nav | Sidebar | **Social ads** present |
| E2 | Keywords cap | Add many | Cap **100** |
| E3 | Competitors | Add up to **5** | Sixth rejected |
| E4 | Site audit | Run audit | **Ad creative angles** panel when deliverables present |
| E5 | Social ads | Save Meta JSON (test values) | Save OK; list loads |
| E6 | Campaign ideas | Generate → **Create draft in Social ads** | Today’s `SocialAd` updated; visible under Social ads |
| E7 | Social draft | Copy caption / image | UI works |
| E8 | Monthly email | Cron + Resend (staging) | Elite receives **PDF** attachment when configured |

---

## D. Admin user

| # | Area | Steps | Pass criteria |
|---|------|--------|----------------|
| A1 | Login | Admin credentials | Redirect `/admin` |
| A2 | Users | List, open user | Edit profile / plan if UI allows |
| A3 | Subscriptions | Assign plan | Client nav updates on next load |
| A4 | Generate | Trigger blog/audit/social draft for user | Completes or clear API error |
| A5 | Negative | Open `/dashboard` as admin | Redirect away from client dashboard |

---

## E. Cross-cutting (any paying client)

| # | Area | Steps | Pass criteria |
|---|------|--------|----------------|
| X1 | Auth | Session expiry / logout | Cannot access dashboard |
| X2 | Register | New account | Can complete profile (plan may be none until admin assigns) |
| X3 | Build | `npm run build` | No type errors |

---

## F. Optional integrations (staging with real keys)

| # | Integration | Notes |
|---|-------------|--------|
| I1 | Google OAuth | GSC + GA4 redirect URIs in Cloud Console |
| I2 | Gemini | Audits, blogs, campaign ideas, social copy |
| I3 | PageSpeed | Lighthouse scores in audit |
| I4 | Resend + cron | Monthly report email |

---

## Related docs

- [user-guide-starter.md](./user-guide-starter.md) · [user-guide-growth.md](./user-guide-growth.md) · [user-guide-elite.md](./user-guide-elite.md)  
- [admin-guide.md](./admin-guide.md)  
- [all-phases-test-cases.md](../phases/all-phases-test-cases.md)
