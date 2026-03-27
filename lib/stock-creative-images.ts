/**
 * Topic images: title / slug / industry / caption keywords → one of public/images/blog/{category}.svg.
 * Same category set and routing idea as Roar Data insights (comparison … architecture, default dashboard).
 * Extended for SEO, paid social, and common verticals — all without generative APIs.
 */
export type BlogImageCategory =
  | "comparison"
  | "consulting"
  | "automation"
  | "dashboard"
  | "governance"
  | "performance"
  | "finance"
  | "forecasting"
  | "reporting"
  | "architecture";

/** Order matters: first match wins (aligned with Roar insights routing, then SEO/ad/vertical extensions). */
const CATEGORY_KEYWORDS: [BlogImageCategory, string[]][] = [
  [
    "comparison",
    [
      "vs",
      "versus",
      "compare",
      "switch",
      "excel to power bi",
      "migration",
      "which is better",
      "alternative to",
      "or ",
    ],
  ],
  [
    "consulting",
    [
      "consultant",
      "choose",
      "choosing",
      "hire",
      "find",
      "partner",
      "agency",
      "professional services",
      "b2b",
      "enterprise",
      "strategy",
      "advisory",
      "workshop",
      "book a",
      "book an",
      "get started",
      "contact us",
      "free consult",
      "uae",
      "dubai",
      "abu dhabi",
      "emirates",
      "qatar",
      "ksa",
      "riyadh",
    ],
  ],
  [
    "automation",
    [
      "automate",
      "automation",
      "reduce time",
      "reduce reporting",
      "workflow",
      "scheduling",
      "chatbot",
      "no-code",
      "zapier",
      "make.com",
    ],
  ],
  [
    "dashboard",
    [
      "dashboard",
      "kpi",
      "cfo dashboard",
      "visuali",
      "analytics",
      "metrics",
      "data viz",
      "visualization",
      "webgl",
      "three.js",
      "threejs",
      "3d website",
      "3d web",
      "immersive",
      "digital experience",
    ],
  ],
  [
    "governance",
    [
      "governance",
      "compliance",
      "security",
      "data quality",
      "best practice",
      "privacy",
      "gdpr",
      "hipaa",
      "audit",
      "risk management",
      "legal",
      "lawyer",
      "attorney",
      "regulatory",
    ],
  ],
  [
    "performance",
    [
      "slow",
      "performance",
      "optimis",
      "optimiz",
      "speed",
      "tuning",
      "dax",
      "rebuild",
      "core web",
      "lighthouse",
      "page speed",
      "core web vitals",
      "ux",
      "a/b test",
      "ab test",
      "landing page",
      "conversion rate",
    ],
  ],
  [
    "finance",
    [
      "financial",
      "cfo",
      "finance",
      "revenue",
      "budget",
      "cost",
      "pricing",
      "subscription",
      "invoice",
      "payment",
      "ecommerce",
      "e-commerce",
      "shopify",
      "woocommerce",
      "retail",
      "sales",
      "roi",
      "mortgage",
      "insurance",
      "investment",
    ],
  ],
  [
    "forecasting",
    [
      "forecast",
      "predict",
      "accuracy",
      "planning",
      "trend",
      "pipeline",
      "quarterly",
      "growth strategy",
      "projection",
    ],
  ],
  [
    "architecture",
    [
      "single source",
      "source of truth",
      "data architecture",
      "integration",
      "centralise",
      "centralize",
      "schema",
      "sitemap",
      "crawl",
      "javascript",
      "api",
      "microservices",
      "cloud",
      "devops",
      "saas",
      "software",
      "platform",
      "tech stack",
    ],
  ],
  [
    "reporting",
    [
      "report",
      "friction",
      "board report",
      "insight",
      "seo",
      "search",
      "ranking",
      "keyword",
      "serp",
      "organic",
      "backlink",
      "analytics",
      "content marketing",
      "social media",
      "meta ads",
      "facebook ads",
      "instagram",
      "facebook",
      "paid social",
      "ppc",
      "sem",
      "google ads",
      "campaign",
      "ad creative",
      "sponsored",
      "promotion",
      "newsletter",
      "email marketing",
      "lead gen",
      "lead generation",
      "funnel",
      "dental",
      "medical practice",
      "clinic",
      "healthcare",
      "law firm",
      "local seo",
    ],
  ],
];

function topicText(parts: (string | null | undefined)[]): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function pickCategory(title: string, slug: string, industry?: string | null): BlogImageCategory {
  const text = topicText([title, slug, industry]);
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => text.includes(kw))) return category;
  }
  return "dashboard";
}

/** Blog cover path (wide hero). */
export function pickBlogHeroPath(
  title: string,
  slug: string,
  industry?: string | null
): string {
  const cat = pickCategory(title, slug, industry);
  return `/images/blog/${cat}.svg`;
}

/** Social / Meta ad thumbnail: same rules on caption + stable rotation when nothing matches. */
export function pickSocialStockPath(
  caption: string,
  dateKey: string,
  extra?: { industry?: string | null; businessName?: string | null }
): string {
  const text = topicText([caption, dateKey, extra?.industry, extra?.businessName]);
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => text.includes(kw))) return `/images/blog/${category}.svg`;
  }
  let h = 0;
  const seed = `${dateKey}:${caption.slice(0, 160)}`;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rotating = CATEGORY_KEYWORDS.map(([c]) => c);
  return `/images/blog/${rotating[h % rotating.length]}.svg`;
}
