import type { IndustryVertical, MarketingGoal } from "@prisma/client";

export const INDUSTRY_VERTICAL_OPTIONS: { value: IndustryVertical; label: string; hint: string }[] = [
  { value: "GENERAL", label: "General / mixed", hint: "Balanced SEO and copy guidance." },
  { value: "LOCAL_SERVICES", label: "Local services", hint: "Maps, calls, service areas, reviews." },
  { value: "ECOMMERCE", label: "E-commerce", hint: "Products, categories, trust, shipping." },
  { value: "SAAS", label: "SaaS / software", hint: "Product value, trials, docs, comparisons." },
  { value: "PROFESSIONAL_SERVICES", label: "Professional services", hint: "Credibility, cases, consult CTAs." },
  { value: "HEALTHCARE", label: "Healthcare", hint: "Trust, compliance tone, clear disclaimers." },
  { value: "CREATIVE_TECH", label: "Creative / tech / agency", hint: "Portfolio, craft, technical depth." },
  { value: "HOSPITALITY", label: "Hospitality / events", hint: "Experience, bookings, locality." },
  { value: "OTHER", label: "Other", hint: "Use the free-text industry field for detail." },
];

export const MARKETING_GOAL_OPTIONS: { value: MarketingGoal; label: string; hint: string }[] = [
  { value: "GENERATE_LEADS", label: "Generate leads", hint: "Forms, calls, consult bookings." },
  { value: "ONLINE_SALES", label: "Online sales", hint: "Cart, checkout, product discovery." },
  { value: "BRAND_AWARENESS", label: "Brand awareness", hint: "Reach, story, shareable angles." },
  { value: "LOCAL_VISITS", label: "Local visits", hint: "Foot traffic, directions, local intent." },
  { value: "PRODUCT_SIGNUPS", label: "Product signups", hint: "Trials, demos, activation." },
  { value: "OTHER", label: "Other / not sure", hint: "General balanced recommendations." },
];

const VERTICAL_SET = new Set<string>(INDUSTRY_VERTICAL_OPTIONS.map((o) => o.value));
const GOAL_SET = new Set<string>(MARKETING_GOAL_OPTIONS.map((o) => o.value));

export function parseIndustryVertical(raw: unknown): IndustryVertical | null {
  if (typeof raw !== "string" || !VERTICAL_SET.has(raw)) return null;
  return raw as IndustryVertical;
}

export function parseMarketingGoal(raw: unknown): MarketingGoal | null {
  if (typeof raw !== "string" || !GOAL_SET.has(raw)) return null;
  return raw as MarketingGoal;
}

/** Injected into site audit Gemini prompt (F3). */
export function presetGuidanceForAudit(vertical: IndustryVertical, goal: MarketingGoal): string {
  const v = verticalGuidance[vertical] || verticalGuidance.GENERAL;
  const g = goalGuidance[goal] || goalGuidance.OTHER;
  return `
Client preset (use to prioritize findings and deliverables; still ground claims in LIVE_HTML):
- Industry vertical: ${vertical}. ${v}
- Primary marketing goal: ${goal}. ${g}
`.trim();
}

/** Appended to blog generation prompt (F3). */
export function presetGuidanceForBlog(vertical: IndustryVertical, goal: MarketingGoal): string {
  const v = verticalGuidance[vertical] || verticalGuidance.GENERAL;
  const g = goalGuidance[goal] || goalGuidance.OTHER;
  return `

Audience and business preset (shape examples, CTAs, and section emphasis):
- Vertical: ${vertical}. ${v}
- Goal: ${goal}. ${g}
`.trim();
}

const verticalGuidance: Record<IndustryVertical, string> = {
  GENERAL:
    "Balanced recommendations across technical SEO, on-page copy, and trust. No single channel dominates.",
  LOCAL_SERVICES:
    "Prioritize local intent: service areas, phone and map clarity, review and trust signals, clear service pages.",
  ECOMMERCE:
    "Prioritize product discovery, category structure, PDP meta and schema, cart friction, shipping and returns trust.",
  SAAS:
    "Prioritize product clarity, differentiation, social proof, pricing or trial paths, and help or docs discovery.",
  PROFESSIONAL_SERVICES:
    "Prioritize authority, case narratives, team credibility, and low-friction consult or quote CTAs.",
  HEALTHCARE:
    "Prioritize trust, plain language, accessibility of forms, and YMYL-appropriate tone. Avoid unsubstantiated medical claims.",
  CREATIVE_TECH:
    "Prioritize craft, portfolio and case depth, technical credibility, and differentiation vs generic agencies.",
  HOSPITALITY:
    "Prioritize experience storytelling, booking or reservation CTAs, locality, and seasonal or event hooks.",
  OTHER: "Follow the free-text industry and keywords closely. Stay practical and specific.",
};

const goalGuidance: Record<MarketingGoal, string> = {
  GENERATE_LEADS:
    "Weight conversion paths, form clarity, phone and CTA visibility, and trust above the fold.",
  ONLINE_SALES:
    "Weight product schema, transactional keywords, urgency and trust on money pages, and reducing purchase friction.",
  BRAND_AWARENESS:
    "Weight memorable positioning, shareable hooks, and breadth of topics while keeping pages crawlable.",
  LOCAL_VISITS:
    "Weight NAP consistency language, directions, hours, and local landing relevance.",
  PRODUCT_SIGNUPS:
    "Weight trial or demo CTAs, objection handling, and feature-to-outcome mapping.",
  OTHER: "Keep recommendations balanced unless LIVE_HTML suggests a clear bottleneck.",
};

/** Phase 5 F10 — when to ask Gemini for the local SEO draft pack on audits. */
export function shouldIncludeLocalSeoPack(u: {
  localSeoPackEnabled: boolean;
  marketingGoal: MarketingGoal;
  industryVertical: IndustryVertical;
}): boolean {
  if (u.localSeoPackEnabled) return true;
  if (u.marketingGoal === "LOCAL_VISITS") return true;
  if (u.industryVertical === "LOCAL_SERVICES") return true;
  return false;
}
