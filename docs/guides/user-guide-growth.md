# User guide — Growth plan (₹899/mo)

Growth includes **everything in Starter**, plus **blogs**, **backlinks**, **GA4**, **campaign ideas**, **higher limits**, **multi-platform social packs**, and **monthly executive email** opt-in. Read the [Starter user guide](./user-guide-starter.md) first—this document adds Growth-only depth.

---

## What makes Growth unique

- **Content engine:** AI **blog drafts** plus **Instagram + Facebook + LinkedIn** captions from blogs and audits.
- **Measurement:** **Google Analytics 4** next to Search Console—sessions, users, top pages.
- **Scale:** Larger keyword list (**50**), calendar (**500** items), competitors (**3**).
- **Paid-social ideation:** **Campaign ideas** with optional free-text direction (no in-app Meta draft—that’s Elite).

---

## Inherited from Starter (same URLs, higher limits)

These screens work like Starter but with **Growth limits** where noted:

| Feature | Growth limit / change |
|---------|------------------------|
| Keywords | **50** phrases |
| Content calendar | **500** items |
| Competitors | **3** URLs |
| Site audit, crawl, GSC, checklist, share report | Same behavior |

**Social post pack from audit:** All **three** platforms (LinkedIn, Instagram, Facebook).

---

## Blogs (`/dashboard/blogs`)

**What it does:** Generates long-form **AI blog drafts** using your Business profile presets (vertical, goal, industry).

**How to use:**

1. Open **Blogs** → create or open a draft (per your UI flow).
2. Use **Generate** where available.
3. Edit in your CMS after export/copy.

**Benefit:** Faster first drafts aligned to your positioning.

**Unique vs Starter:** Starter has **no** blog generator.

**Tip:** After a good post, use **social post pack** on the blog for three-platform promotion copy.

---

## Backlinks (`/dashboard/backlinks`)

**What it does:** Checklist of backlink opportunities / directories to work through (operator-configured defaults plus your progress).

**How to use:** Open **Backlinks**, work items, mark status as you submit or verify.

**Benefit:** Structured off-page work instead of ad-hoc bookmarks.

---

## Web analytics — GA4 (`/dashboard/analytics`)

**What it does:** OAuth to Google (same app as Search Console with an extra redirect + **Analytics Data API**). You paste your numeric **GA4 Property ID**, then **Sync** to pull last-28-day style totals and top pages.

**How to use:**

1. **Connect Google** (read-only analytics scope).
2. In GA4: **Admin → Property settings** → copy **Property ID**.
3. Paste in the app, **Save property**, then **Sync now**.

**Benefit:** See traffic context beside SEO queries—useful for “SEO vs demand” conversations.

**Unique vs Starter:** Starter users are redirected away from this page.

**Tooltip:** The **?** next to Property ID explains where to find it in GA4.

---

## Campaign ideas (`/dashboard/campaign-ideas`)

**What it does:** One click (optional **Your direction** text up to 2,000 characters) sends your business profile + **today’s date** (IST weekday context) to Gemini. You get **four** concrete ideas: hook, format (reel/post/etc.), rationale, trend/occasion, hashtags.

**How to use:**

1. Optionally describe a sale, festival, launch, or tone in **Your direction**.
2. Click **Get today’s campaign ideas**.
3. Read ideas; implement in Meta or your creative team.

**Important:** The model **does not browse live news**. Verify holidays and local events before spending ad budget.

**Benefit:** Breaks creative block with timely, business-specific angles.

**Growth vs Elite:** On Growth you **see ideas only**. **Elite** adds **Create draft in Social ads** (second Gemini pass + saves today’s draft).

---

## Monthly executive email (Business profile)

**What it does:** If your operator enabled **Resend** and cron, you can opt in to a **monthly HTML summary** email.

**How to use:** On **Business profile**, toggle **Monthly executive email** and save.

**Benefit:** Automated stakeholder touchpoint without opening the dashboard.

**Growth vs Elite:** Elite may include a **PDF** attachment on the same email when the server is configured for it.

---

## Quick comparison: Growth vs Starter

| Capability | Starter | Growth |
|------------|---------|--------|
| Blogs | No | Yes |
| Backlinks | No | Yes |
| GA4 | No | Yes |
| Campaign ideas | No | Yes (ideas only) |
| Calendar items | 2 | 500 |
| Keywords | 10 | 50 |
| Competitors | 1 | 3 |
| Social pack platforms | LinkedIn only | 3 platforms |
| Monthly email opt-in | Hidden | Yes |

---

## Troubleshooting (Growth)

| Symptom | Check |
|---------|--------|
| GA4 “not configured on server” | Operator must add GA4 callback URI + enable Analytics Data API |
| Campaign ideas 502 | Gemini key (server or BYOK) |
| No “Create draft” on ideas | Expected on Growth—upgrade to Elite |

---

## Next step

- [User guide — Elite](./user-guide-elite.md) for Meta ads and audit ad angles.  
- [QA checklist](./qa-full-product-test-cases.md) for Growth test rows **G1–G12**.
