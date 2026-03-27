# Phase 0 (F3) — User flow: industry & marketing presets

How **clients** and **admins** set **industry vertical** and **marketing goal**, and where those values affect the product.

---

## Flowchart (Mermaid)

```mermaid
flowchart TB
  subgraph entry["How presets get set"]
    A[New user: Register page] --> S[(User row in DB)]
    B[Existing client: Dashboard → Business profile] --> PATCH["PATCH /api/user/profile"]
    PATCH --> S
    C[Admin: Users → edit client] --> ADPATCH["PATCH /api/admin/users/:id"]
    ADPATCH --> S
  end

  subgraph stored["Stored on User"]
    S --> IV[industryVertical enum]
    S --> MG[marketingGoal enum]
    S --> FT[industry free text + keywords + business fields]
  end

  subgraph ai["Where presets are used today"]
    IV --> AUDIT[Site audit Gemini prompt]
    MG --> AUDIT
    FT --> AUDIT
    IV --> BLOG[Blog generation Gemini prompt]
    MG --> BLOG
    FT --> BLOG
  end

  subgraph actions["Client actions after saving"]
    AUDIT --> RUN[Run Site audit]
    BLOG --> GEN[Admin generates blog for client]
  end

  RUN --> OUT1[Findings + deliverables tuned to vertical and goal]
  GEN --> OUT2[Post angle + CTAs tuned to vertical and goal]
```

---

## Step-by-step (plain language)

1. **Register**  
   User chooses **Industry vertical** and **Marketing goal** (plus optional free-text industry). Values are saved on the account.

2. **Later changes**  
   User opens **Dashboard → Business profile**, updates presets or business fields, **Save**. The next audit/blog run uses the new values.

3. **Admin override**  
   Admin opens **Admin → Users → [client]**, edits the same fields, **Save**.

4. **What changes for the user**  
   - **Site audit**: AI instructions include extra guidance for the chosen vertical and goal (still grounded in live HTML).  
   - **Blogs** (Growth/Elite): generation prompt includes the same preset tail.

5. **What does not change automatically**  
   Past audit rows in history are unchanged; only **new** runs pick up new presets.

---

## Quick test checklist

- [ ] Register with a non-default vertical/goal → row in DB has `industryVertical` / `marketingGoal`.  
- [ ] **Business profile** → save → reload page → values persist.  
- [ ] Admin user edit → save → client sees updated values on next profile load.  
- [ ] Run audit (with `GEMINI_API_KEY`) → completes without error (prompt includes preset block).  

---

## Related code

| Area | Location |
|------|-----------|
| Enums + User fields | `prisma/schema.prisma` |
| Labels, validation, prompt snippets | `lib/marketing-presets.ts` |
| Audit prompt | `lib/site-audit.ts` |
| Blog prompt | `lib/gemini-blog.ts` |
| Client API | `app/api/user/profile/route.ts` |
| Client UI | `app/dashboard/settings/` |
| Register | `app/register/page.tsx`, `app/api/register/route.ts` |
| Admin | `app/admin/users/[id]/user-edit-form.tsx`, `app/api/admin/users/[id]/route.ts` |
