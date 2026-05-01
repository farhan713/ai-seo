import type { Plan } from "@prisma/client";

export function planLabel(plan: Plan): string {
  switch (plan) {
    case "STARTER_499":
      return "Starter · ₹499/mo";
    case "GROWTH_899":
      return "Growth · ₹899/mo";
    case "ELITE_1599":
      return "Elite · ₹1,599/mo";
    default:
      return plan;
  }
}

/** Website audit (keywords, meta, on-page suggestions) */
export function hasAuditAccess(plan: Plan | null | undefined): boolean {
  return !!plan;
}

/** AI blogs + backlink checklist */
export function hasGrowthFeatures(plan: Plan | null | undefined): boolean {
  return plan === "GROWTH_899" || plan === "ELITE_1599";
}

/** Daily social ads + Meta posting (requires credentials + Meta app setup) */
export function hasSocialAutomation(plan: Plan | null | undefined): boolean {
  return plan === "ELITE_1599";
}

/** F8 content calendar: Starter small cap, Growth+ full. */
export function contentCalendarItemLimit(plan: Plan | null | undefined): number {
  switch (plan) {
    case "STARTER_499":
      return 2;
    case "GROWTH_899":
    case "ELITE_1599":
      return 500;
    default:
      return 0;
  }
}

/** F11 social post pack: how many platform captions to generate (Starter: LinkedIn only). */
export function socialPostPackPlatforms(plan: Plan | null | undefined): ("linkedin" | "instagram" | "facebook")[] {
  if (plan === "STARTER_499") return ["linkedin"];
  if (plan === "GROWTH_899" || plan === "ELITE_1599") {
    return ["linkedin", "instagram", "facebook"];
  }
  return [];
}

/** F4 competitor watchlist row cap by plan. */
export function competitorWatchlistLimit(plan: Plan | null | undefined): number {
  switch (plan) {
    case "STARTER_499":
      return 1;
    case "GROWTH_899":
      return 3;
    case "ELITE_1599":
      return 5;
    default:
      return 0;
  }
}

/** F2 — monthly executive email is available on Growth and Elite (Starter uses dashboard only). */
export function hasMonthlyExecutiveReport(plan: Plan | null | undefined): boolean {
  return plan === "GROWTH_899" || plan === "ELITE_1599";
}

/** F2 — Elite attaches a simple branded PDF alongside the HTML email. */
export function hasMonthlyReportPdfAttachment(plan: Plan | null | undefined): boolean {
  return plan === "ELITE_1599";
}

/** Phase 5 F7 — GA4 uses same Google OAuth app as Search Console (extra scope + redirect URI). */
export function hasGa4Access(plan: Plan | null | undefined): boolean {
  return hasGrowthFeatures(plan);
}

/** Phase 5 F19 — any plan with audits can create a share link. */
export function hasShareableReport(plan: Plan | null | undefined): boolean {
  return hasAuditAccess(plan);
}

/** Phase 5 F13 — ad creative angle variants (Gemini) on Site audit. */
export function hasAdCreativeAngles(plan: Plan | null | undefined): boolean {
  return hasSocialAutomation(plan);
}

/** Trend / holiday / seasonal Meta campaign ideas (Gemini). Growth and Elite. */
export function hasTrendCampaignIdeas(plan: Plan | null | undefined): boolean {
  return hasGrowthFeatures(plan);
}

/** Turn a campaign idea into today’s Social ad draft in-app (Elite). */
export function hasCampaignIdeaSocialDraft(plan: Plan | null | undefined): boolean {
  return hasSocialAutomation(plan);
}

/** Daily 9 AM IST cron eligibility — Elite plan gets a daily backlink slice + 2 fresh blogs. */
export function hasDailyEliteCadence(plan: Plan | null | undefined): boolean {
  return plan === "ELITE_1599";
}
