# User guide — Elite plan (₹1,599/mo)

Elite is **Growth plus paid social depth**: **Social ads** workspace, **ad creative angles** inside **Site audit**, **campaign idea → draft in one click**, and **monthly email with PDF** when your operator enables it. Read [Starter](./user-guide-starter.md) and [Growth](./user-guide-growth.md) for shared features—this guide focuses on **Elite-only** power and limits.

---

## What makes Elite unique

- **Audit → ads:** **Ad creative angles** (Meta-style + Google RSA-style copy blocks) generated with the same audit that fixes SEO.
- **Social ads hub:** Store **Meta credentials** (JSON), view **AI drafts** with captions and visuals (stock or Imagen when configured).
- **Campaign ideas → draft:** From **Campaign ideas**, **Create draft in Social ads** runs a **second** Gemini pass and **updates today’s** Social ad row (same slot as admin-generated daily drafts).
- **Highest limits:** **100** keywords, **5** competitors, full Growth surface area.

---

## Elite-only limits

| Feature | Elite cap |
|---------|-----------|
| Tracked keywords | **100** |
| Competitors | **5** |

---

## Site audit — Ad creative angles

**What it does:** After the normal audit sections, you may see **Ad creative angles** with headline/body variants for **Meta** and **Google RSAs**-style formats.

**How to use:** Copy lines into Ads Manager; respect character limits in the ad editor.

**Benefit:** Organic audit insights and **paid creative** stay aligned—rare in pure SEO tools.

**Not available on:** Starter or Growth.

---

## Social ads (`/dashboard/social`)

**What it does:**

1. **Credentials JSON** — long-lived **Facebook Page** token and **Instagram Business Account ID** (see **?** tooltip for a high-level token workflow).
2. **Recent drafts** — daily-style **SocialAd** rows: caption pack (Instagram + Facebook sections), optional **AI image** or stock fallback.

**How to use:**

1. Obtain tokens via Meta Business Suite / Graph API (production setups need proper app review and encryption—your operator’s responsibility).
2. Paste JSON → **Save credentials**.
3. Review drafts; **Copy full pack** to publish manually or through Meta until auto-post is wired.

**Benefit:** One dashboard for **creative + visual** drafts tied to your brand.

**Unique:** Growth clients do not see this page.

---

## Campaign ideas — Create draft in Social ads

**What it does:** On `/dashboard/campaign-ideas`, each idea card has **Create draft in Social ads**. That:

1. Builds a **brief** from the idea (title, hook, format, rationale, hashtags).
2. Calls Gemini with the same **social ad copy** prompt stack used elsewhere.
3. **Upserts** the row for **today’s date** in **Social ads** (caption + image treatment like the admin cron path).

**How to use:** Generate ideas (optional **Your direction** text) → pick the best idea → **Create draft** → open **Social ads** to copy/publish.

**Caveat:** **Today’s draft is one row per day**—a new **Create draft** **replaces** the existing draft for that date (same behavior as admin “today’s draft”).

**Benefit:** From “trend idea” to **paste-ready Meta copy** in two clicks.

**Elite-only:** Growth users see ideas without this button.

---

## Monthly executive email — PDF (Elite)

When your operator configures **Resend**, **cron**, and Elite PDF generation, your monthly email can include a **PDF** attachment (Growth gets HTML only).

**How to use:** Opt in on **Business profile** like Growth users.

---

## Full Elite checklist (everything to try once)

1. Business profile + optional BYOK keys + local SEO toggle.  
2. Site audit → confirm **Ad creative angles** section.  
3. Keywords (up to 100), competitors (up to 5), calendar, blogs, backlinks, GA4 sync.  
4. Campaign ideas with custom **Your direction** → **Create draft** → verify under **Social ads**.  
5. Share report link for a stakeholder.  
6. Social credentials save + review latest draft image/caption.

---

## Troubleshooting (Elite)

| Symptom | Check |
|---------|--------|
| No ad angles in audit | Run a **new** audit; feature is Elite-gated in API |
| Create draft fails | Gemini (server or BYOK); Elite subscription active |
| Imagen missing | Server `GEMINI_API_KEY` + Imagen not disabled; failures fall back to **stock** art |
| Meta post not automatic | MVP stores credentials for integration; posting may still be **manual copy** |

---

## Related docs

- [QA checklist — Elite rows](./qa-full-product-test-cases.md) **E1–E8**  
- [Client credentials](./client-credentials-and-keys.md)  
- [Admin guide](./admin-guide.md) for operators generating drafts
