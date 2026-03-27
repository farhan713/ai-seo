import { GoogleGenerativeAI } from "@google/generative-ai";
import type { IndustryVertical, MarketingGoal } from "@prisma/client";
import type { PageSignals } from "@/lib/page-fetch-audit";
import { formatPageSignalsForPrompt } from "@/lib/page-fetch-audit";
import { presetGuidanceForAudit } from "@/lib/marketing-presets";

export type AuditFinding = {
  area: string;
  severity: "high" | "medium" | "low";
  detail: string;
  suggestion: string;
};

export type CtaFormRecommendations = {
  primaryCta: string;
  secondaryCta: string;
  formFieldTips: string[];
};

export type FaqBlock = { question: string; answer: string };
export type ObjectionHandler = { objection: string; response: string };
export type LeadCaptureItem = { label: string; status: "pass" | "warn" | "fail"; note: string };

export type LeadCaptureReview = {
  score: number;
  summary: string;
  items: LeadCaptureItem[];
};

/** Phase 4 F12 — lead magnet / landing section blocks. */
export type LandingLeadMagnet = {
  headline: string;
  subhead: string;
  bullets: string[];
  primaryCta: string;
  formIntro: string;
};

/** Phase 5 F13 — paid social / search style angles (drafts only). */
export type AdCreativeAngles = {
  meta: { headlines: string[]; primaryTexts: string[]; descriptions: string[] };
  google: { headlines: string[]; descriptions: string[] };
};

/** Phase 5 F10 — local / GBP-oriented drafts (no live GBP API). */
export type LocalSeoPack = {
  gbpPostIdeas: string[];
  qaSuggestions: { question: string; suggestedAnswer: string }[];
  napChecklist: string[];
  reviewResponseSnippets: string[];
};

/** AI-generated assets free speed-test sites do not ship in one productized flow. */
export type AuditDeliverables = {
  opportunityIndex: number;
  opportunityLabel: string;
  opportunityRationale: string;
  metaTitleVariants: string[];
  metaDescriptionVariants: string[];
  jsonLdObject: Record<string, unknown>;
  schemaInstallHint: string;
  competitorGapAnalysis: string;
  contentPillarIdeas: string[];
  ctaMicrocopyIdeas: string[];
  internalLinkingIdeas: string[];
  /** Phase 3 — F15 */
  ctaFormRecommendations: CtaFormRecommendations;
  /** Phase 3 — F16 */
  faqBlocks: FaqBlock[];
  objectionHandlers: ObjectionHandler[];
  /** Phase 3 — F17 */
  leadCaptureReview: LeadCaptureReview;
  /** Phase 4 — F12 */
  landingLeadMagnet: LandingLeadMagnet;
  /** Phase 5 — F13 (Elite) */
  adCreativeAngles: AdCreativeAngles;
  /** Phase 5 — F10 (local) */
  localSeoPack: LocalSeoPack;
};

export type SiteAuditResult = {
  summary: string;
  findings: AuditFinding[];
  deliverables: AuditDeliverables;
};

function normalizeSeverity(s: string): "high" | "medium" | "low" {
  const u = s.toLowerCase();
  if (u.includes("high") || u.includes("critical")) return "high";
  if (u.includes("medium") || u.includes("moderate")) return "medium";
  return "low";
}

function normLeadStatus(s: string): "pass" | "warn" | "fail" {
  const u = s.toLowerCase();
  if (u === "pass" || u === "warn" || u === "fail") return u;
  if (u.includes("fail") || u.includes("poor")) return "fail";
  if (u.includes("warn") || u.includes("needs")) return "warn";
  return "pass";
}

export function clampDeliverables(raw: Partial<AuditDeliverables> | undefined): AuditDeliverables {
  const idx = typeof raw?.opportunityIndex === "number" ? Math.round(raw.opportunityIndex) : 50;
  const ctaRaw = raw?.ctaFormRecommendations as Record<string, unknown> | undefined;
  const faqRaw = raw?.faqBlocks;
  const objRaw = raw?.objectionHandlers;
  const leadRaw = raw?.leadCaptureReview as Record<string, unknown> | undefined;
  const magnetRaw = raw?.landingLeadMagnet as Record<string, unknown> | undefined;

  const ctaFormRecommendations: CtaFormRecommendations = {
    primaryCta: String(ctaRaw?.primaryCta || raw?.ctaMicrocopyIdeas?.[0] || "Book a consultation").slice(0, 400),
    secondaryCta: String(ctaRaw?.secondaryCta || raw?.ctaMicrocopyIdeas?.[1] || "Download the guide").slice(0, 400),
    formFieldTips: Array.isArray(ctaRaw?.formFieldTips)
      ? (ctaRaw.formFieldTips as unknown[]).map((x) => String(x).slice(0, 220)).filter(Boolean).slice(0, 8)
      : ["Keep required fields minimal on first step", "Use inline validation and clear error text"],
  };

  const faqBlocks: FaqBlock[] = Array.isArray(faqRaw)
    ? (faqRaw as unknown[])
        .map((x) => {
          if (!x || typeof x !== "object") return null;
          const o = x as Record<string, unknown>;
          const q = String(o.question || "").slice(0, 300);
          const a = String(o.answer || "").slice(0, 800);
          return q && a ? { question: q, answer: a } : null;
        })
        .filter((x): x is FaqBlock => x != null)
        .slice(0, 8)
    : [];

  const objectionHandlers: ObjectionHandler[] = Array.isArray(objRaw)
    ? (objRaw as unknown[])
        .map((x) => {
          if (!x || typeof x !== "object") return null;
          const o = x as Record<string, unknown>;
          const ob = String(o.objection || "").slice(0, 200);
          const res = String(o.response || "").slice(0, 600);
          return ob && res ? { objection: ob, response: res } : null;
        })
        .filter((x): x is ObjectionHandler => x != null)
        .slice(0, 6)
    : [];

  const leadCaptureReviewBase: LeadCaptureReview = {
    score: typeof leadRaw?.score === "number" ? Math.min(100, Math.max(0, Math.round(leadRaw.score as number))) : 50,
    summary: String(leadRaw?.summary || "").slice(0, 600),
    items: [],
  };
  let leadItems = leadCaptureReviewBase.items;
  const itemsRaw = leadRaw?.items;
  if (Array.isArray(itemsRaw)) {
    leadItems = itemsRaw
      .map((x) => {
        if (!x || typeof x !== "object") return null;
        const o = x as Record<string, unknown>;
        const label = String(o.label || "").slice(0, 120);
        const note = String(o.note || "").slice(0, 240);
        const status = normLeadStatus(String(o.status || "warn"));
        return label ? { label, status, note } : null;
      })
      .filter((x): x is LeadCaptureItem => x != null)
      .slice(0, 10);
  }
  if (leadItems.length === 0) {
    leadItems = [
      { label: "Primary CTA visible above the fold on mobile", status: "warn", note: "Review hero and sticky CTA placement." },
      { label: "Form friction vs lead quality", status: "warn", note: "Balance field count with conversion goal." },
      { label: "Trust signals near conversion points", status: "warn", note: "Logos, reviews, or guarantees near forms." },
    ];
  }
  let leadSummary = leadCaptureReviewBase.summary;
  if (!leadSummary) {
    leadSummary =
      "Lead capture blends CTA clarity, form design, and trust. Use findings and live HTML to prioritize fixes.";
  }
  const leadCaptureReview: LeadCaptureReview = {
    score: leadCaptureReviewBase.score,
    summary: leadSummary,
    items: leadItems,
  };

  const bulletsRaw = magnetRaw?.bullets;
  const landingLeadMagnet: LandingLeadMagnet = {
    headline: String(magnetRaw?.headline || raw?.opportunityLabel || "Download your free guide").slice(0, 120),
    subhead: String(magnetRaw?.subhead || "").slice(0, 280),
    bullets: Array.isArray(bulletsRaw)
      ? (bulletsRaw as unknown[]).map((x) => String(x).slice(0, 160)).filter(Boolean).slice(0, 6)
      : ["Actionable checklist tailored to your site", "No fluff: prioritized fixes you can ship this week"],
    primaryCta: String(magnetRaw?.primaryCta || raw?.ctaMicrocopyIdeas?.[0] || "Get the guide").slice(0, 120),
    formIntro: String(
      magnetRaw?.formIntro ||
        "Enter your work email and we will send the PDF. We use your email only for this download unless you opt in to more."
    ).slice(0, 400),
  };

  const adRaw = raw?.adCreativeAngles as Record<string, unknown> | undefined;
  const metaRaw = adRaw?.meta as Record<string, unknown> | undefined;
  const googleRaw = adRaw?.google as Record<string, unknown> | undefined;
  const adCreativeAngles: AdCreativeAngles = {
    meta: {
      headlines: Array.isArray(metaRaw?.headlines)
        ? (metaRaw.headlines as unknown[]).map((x) => String(x).slice(0, 42)).filter(Boolean).slice(0, 8)
        : [],
      primaryTexts: Array.isArray(metaRaw?.primaryTexts)
        ? (metaRaw.primaryTexts as unknown[]).map((x) => String(x).slice(0, 130)).filter(Boolean).slice(0, 6)
        : [],
      descriptions: Array.isArray(metaRaw?.descriptions)
        ? (metaRaw.descriptions as unknown[]).map((x) => String(x).slice(0, 32)).filter(Boolean).slice(0, 6)
        : [],
    },
    google: {
      headlines: Array.isArray(googleRaw?.headlines)
        ? (googleRaw.headlines as unknown[]).map((x) => String(x).slice(0, 32)).filter(Boolean).slice(0, 12)
        : [],
      descriptions: Array.isArray(googleRaw?.descriptions)
        ? (googleRaw.descriptions as unknown[]).map((x) => String(x).slice(0, 92)).filter(Boolean).slice(0, 6)
        : [],
    },
  };

  const locRaw = raw?.localSeoPack as Record<string, unknown> | undefined;
  const qaRaw = locRaw?.qaSuggestions;
  const localSeoPack: LocalSeoPack = {
    gbpPostIdeas: Array.isArray(locRaw?.gbpPostIdeas)
      ? (locRaw.gbpPostIdeas as unknown[]).map((x) => String(x).slice(0, 320)).filter(Boolean).slice(0, 8)
      : [],
    qaSuggestions: Array.isArray(qaRaw)
      ? (qaRaw as unknown[])
          .map((x) => {
            if (!x || typeof x !== "object") return null;
            const o = x as Record<string, unknown>;
            const q = String(o.question || "").slice(0, 200);
            const a = String(o.suggestedAnswer ?? o.answer ?? "").slice(0, 400);
            return q && a ? { question: q, suggestedAnswer: a } : null;
          })
          .filter((x): x is { question: string; suggestedAnswer: string } => x != null)
          .slice(0, 8)
      : [],
    napChecklist: Array.isArray(locRaw?.napChecklist)
      ? (locRaw.napChecklist as unknown[]).map((x) => String(x).slice(0, 220)).filter(Boolean).slice(0, 10)
      : [],
    reviewResponseSnippets: Array.isArray(locRaw?.reviewResponseSnippets)
      ? (locRaw.reviewResponseSnippets as unknown[]).map((x) => String(x).slice(0, 280)).filter(Boolean).slice(0, 8)
      : [],
  };

  return {
    opportunityIndex: Math.min(100, Math.max(0, idx)),
    opportunityLabel: String(raw?.opportunityLabel || "SEO readiness").slice(0, 80),
    opportunityRationale: String(raw?.opportunityRationale || "").slice(0, 500),
    metaTitleVariants: Array.isArray(raw?.metaTitleVariants)
      ? raw.metaTitleVariants.map((x) => String(x).slice(0, 70)).filter(Boolean).slice(0, 3)
      : [],
    metaDescriptionVariants: Array.isArray(raw?.metaDescriptionVariants)
      ? raw.metaDescriptionVariants.map((x) => String(x).slice(0, 200)).filter(Boolean).slice(0, 3)
      : [],
    jsonLdObject:
      raw?.jsonLdObject && typeof raw.jsonLdObject === "object" && !Array.isArray(raw.jsonLdObject)
        ? (raw.jsonLdObject as Record<string, unknown>)
        : { "@context": "https://schema.org", "@type": "WebSite", name: "Your site", url: "" },
    schemaInstallHint: String(raw?.schemaInstallHint || "Paste the JSON-LD script in your site <head> or via your CMS custom code block.").slice(
      0,
      300
    ),
    competitorGapAnalysis: String(raw?.competitorGapAnalysis || "").slice(0, 1200),
    contentPillarIdeas: Array.isArray(raw?.contentPillarIdeas)
      ? raw.contentPillarIdeas.map((x) => String(x).slice(0, 200)).filter(Boolean).slice(0, 6)
      : [],
    ctaMicrocopyIdeas: Array.isArray(raw?.ctaMicrocopyIdeas)
      ? raw.ctaMicrocopyIdeas.map((x) => String(x).slice(0, 120)).filter(Boolean).slice(0, 4)
      : [],
    internalLinkingIdeas: Array.isArray(raw?.internalLinkingIdeas)
      ? raw.internalLinkingIdeas.map((x) => String(x).slice(0, 200)).filter(Boolean).slice(0, 5)
      : [],
    ctaFormRecommendations,
    faqBlocks,
    objectionHandlers,
    leadCaptureReview,
    landingLeadMagnet,
    adCreativeAngles,
    localSeoPack,
  };
}

export async function runSiteAuditGemini(input: {
  url: string;
  businessName?: string | null;
  industry?: string | null;
  industryVertical?: IndustryVertical | null;
  marketingGoal?: MarketingGoal | null;
  targetKeywords?: string | null;
  measuredWebVitalsHint?: string;
  primaryPage?: PageSignals;
  competitorPage?: PageSignals | null;
  includeAdCreativeAngles?: boolean;
  includeLocalSeoPack?: boolean;
  geminiApiKey?: string | null;
}): Promise<SiteAuditResult> {
  const apiKey = input.geminiApiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set and no client Gemini key provided");

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json" },
  });

  const measured = input.measuredWebVitalsHint?.trim();
  const measuredUpper = measured?.toUpperCase() ?? "";
  const lighthouseFailed =
    measuredUpper.includes("PAGE_HUNG") ||
    measuredUpper.includes("PAGE HUNG") ||
    measuredUpper.includes("LIGHTHOUSE RUN NOTE") ||
    measuredUpper.includes("PAGESPEED API");
  const measuredBlock = measured
    ? `\nMeasured lab data (PageSpeed or Lighthouse summary, trust numeric scores when present):\n${measured}\n`
    : "\nNo live Lighthouse numbers attached. Still produce deliverables from live HTML signals and business context.\n";

  const failureNote = lighthouseFailed
    ? "\nLighthouse failed or hung: still output deliverables. Set opportunityIndex lower if the site likely blocks bots or is very heavy. Mention lab failure in one finding.\n"
    : "";

  const livePrimary = input.primaryPage
    ? formatPageSignalsForPrompt("LIVE_HTML_PRIMARY", input.primaryPage)
    : "LIVE_HTML_PRIMARY: not available.\n";

  const liveCompetitor =
    input.competitorPage && input.competitorPage.ok !== false && !input.competitorPage.fetchError
      ? formatPageSignalsForPrompt("LIVE_HTML_COMPETITOR", input.competitorPage)
      : input.competitorPage?.fetchError
        ? `LIVE_HTML_COMPETITOR: could not fetch (${input.competitorPage.fetchError}).\n`
        : "";

  const vertical = input.industryVertical ?? "GENERAL";
  const goal = input.marketingGoal ?? "OTHER";
  const presetBlock = presetGuidanceForAudit(vertical, goal);

  const includeAd = !!input.includeAdCreativeAngles;
  const includeLocal = !!input.includeLocalSeoPack;

  let phase5Rules = "";
  if (includeAd) {
    phase5Rules += `
- adCreativeAngles: Draft ads only. meta.headlines: 5 options max 40 characters for Facebook/Instagram feed. meta.primaryTexts: 3 options max 125 characters. meta.descriptions: 3 options max 30 characters. google.headlines: 8 options max 30 characters for Google RSA. google.descriptions: 4 options max 90 characters. Tie copy to audit themes and target keywords. Straight ASCII apostrophes.`;
  }
  if (includeLocal) {
    phase5Rules += `
- localSeoPack: Draft local visibility content only (no live Google Business Profile API). gbpPostIdeas: 5 short post drafts (updates, offers, seasonal). qaSuggestions: 5 { question, suggestedAnswer } pairs a customer might ask on GBP Q&A. napChecklist: 6 bullets on name/address/phone/hours consistency. reviewResponseSnippets: 4 short reply templates for positive and mixed reviews.`;
  }

  const adJson = includeAd
    ? `,
    "adCreativeAngles": { "meta": { "headlines": [], "primaryTexts": [], "descriptions": [] }, "google": { "headlines": [], "descriptions": [] } }`
    : "";
  const localJson = includeLocal
    ? `,
    "localSeoPack": { "gbpPostIdeas": [], "qaSuggestions": [{ "question": "", "suggestedAnswer": "" }], "napChecklist": [], "reviewResponseSnippets": [] }`
    : "";

  const prompt = `You are the lead product architect for a premium B2B SEO SaaS. Free tools show Lighthouse and generic tips. Your job is to produce a structured audit that includes COPY-READY deliverables and competitive narrative, grounded in the LIVE HTML excerpts below (not hallucinated page copy).

Client URL: ${input.url}
Business name: ${input.businessName || "unknown"}
Industry (free text from client): ${input.industry || "unknown"}
Target keywords (client intent): ${input.targetKeywords || "not specified"}

${presetBlock}

${livePrimary}
${liveCompetitor || "No competitor page was fetched. Set competitorGapAnalysis to empty string.\n"}
${measuredBlock}${failureNote}

Rules:
- Use straight ASCII apostrophes. No em dashes. No semicolons in strings.
- Findings must reference what you saw in LIVE_HTML when possible (title length, missing meta, H1 issues, canonical, og tags).
- opportunityIndex is YOUR proprietary 0 to 100 score combining severity of issues, Lighthouse hint if present, and crawl signals. Not the same as Lighthouse performance score.
- metaTitleVariants: exactly 3 distinct options, each under 60 characters, keyword-aware for the client.
- metaDescriptionVariants: exactly 3 distinct options, 140 to 155 characters each, compelling CTR focus.
- jsonLdObject: ONE valid JSON-LD object for schema.org (prefer WebSite with url and name, or Organization with name logo url). Use real business name and client URL. No HTML, only the object that would go inside script type application/ld+json.
- contentPillarIdeas: 4 to 6 specific article or landing page ideas that close content gaps vs target keywords.
- internalLinkingIdeas: 3 to 5 concrete internal link suggestions (from page A anchor text to page B topic) even if URLs are guessed paths like /services /pricing /blog/topic.
- ctaMicrocopyIdeas: 3 short CTA lines for hero or buttons.
- competitorGapAnalysis: if competitor HTML was provided, 3 to 5 sentences on positioning and keyword or messaging gaps. Otherwise empty string.
- ctaFormRecommendations: primaryCta and secondaryCta as full button or link label suggestions (not generic). formFieldTips: 4 to 6 bullets on labels, validation, and progressive profiling.
- faqBlocks: 5 to 7 FAQ pairs for the client's service or product page, paste-ready, schema-friendly short answers under 320 characters each answer.
- objectionHandlers: 4 to 6 { objection, response } pairs for sales or service objections (price, timing, trust, competitor).
- leadCaptureReview: score 0 to 100 for forms and conversion UX based on LIVE_HTML and Lighthouse hints. summary: 2 to 3 sentences. items: 5 to 8 { label, status: "pass"|"warn"|"fail", note } for specific checks (mobile CTA, form length, privacy link, thank-you path, etc.).
- landingLeadMagnet: headline and subhead for a lead-magnet landing hero, bullets: 4 to 6 outcome bullets, primaryCta button text, formIntro: one sentence above the email field (privacy-friendly).
${phase5Rules}

Return JSON only:
{
  "summary": "3 to 4 sentences. Mention live HTML signals and what you shipped in deliverables.",
  "findings": [
    { "area": "Meta tags", "severity": "high"|"medium"|"low", "detail": "...", "suggestion": "..." }
  ],
  "deliverables": {
    "opportunityIndex": 0,
    "opportunityLabel": "short label like Strong upside or Needs foundation work",
    "opportunityRationale": "one or two sentences how you scored the index",
    "metaTitleVariants": ["","",""],
    "metaDescriptionVariants": ["","",""],
    "jsonLdObject": { "@context": "https://schema.org", "@type": "WebSite" },
    "schemaInstallHint": "where to paste",
    "competitorGapAnalysis": "",
    "contentPillarIdeas": [],
    "ctaMicrocopyIdeas": [],
    "internalLinkingIdeas": [],
    "ctaFormRecommendations": { "primaryCta": "", "secondaryCta": "", "formFieldTips": [] },
    "faqBlocks": [{ "question": "", "answer": "" }],
    "objectionHandlers": [{ "objection": "", "response": "" }],
    "leadCaptureReview": { "score": 0, "summary": "", "items": [{ "label": "", "status": "warn", "note": "" }] },
    "landingLeadMagnet": { "headline": "", "subhead": "", "bullets": [], "primaryCta": "", "formIntro": "" }${adJson}${localJson}
  }
}
Include 7 to 12 findings across meta, headings, structured data, internal links, performance, E-E-A-T, and conversion.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text) as {
    summary?: string;
    findings?: AuditFinding[];
    deliverables?: Partial<AuditDeliverables>;
  };
  if (!parsed.findings || !Array.isArray(parsed.findings)) {
    throw new Error("Invalid audit response");
  }
  const findings = parsed.findings.map((f) => ({
    area: String(f.area || "General").slice(0, 80),
    severity: normalizeSeverity(String(f.severity || "low")),
    detail: String(f.detail || "").slice(0, 800),
    suggestion: String(f.suggestion || "").slice(0, 800),
  }));

  return {
    summary: String(parsed.summary || "").trim(),
    findings,
    deliverables: clampDeliverables(parsed.deliverables),
  };
}
