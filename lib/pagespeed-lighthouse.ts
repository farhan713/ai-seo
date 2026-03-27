/**
 * Google PageSpeed Insights API v5 — same Lighthouse scores as Chrome DevTools “Lighthouse”.
 * Enable “PageSpeed Insights API” in Google Cloud and create an API key.
 */

export type LighthouseScores = {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
};

export type LighthouseOpportunity = {
  id: string;
  title: string;
  description: string;
  displayValue?: string;
};

export type LighthouseSnapshot = {
  strategy: "mobile" | "desktop";
  fetchedAt: string;
  scores: LighthouseScores;
  opportunities: LighthouseOpportunity[];
  finalUrl?: string;
  psiWebUrl: string;
  error?: never;
};

export type LighthouseError = {
  error: string;
  fetchedAt: string;
  psiWebUrl: string;
};

export type LighthouseResult = LighthouseSnapshot | LighthouseError;

/** Stored on SiteAudit.lighthouse — mobile + desktop lab runs in one audit. */
export type LighthouseDualBundle = {
  version: 2;
  psiWebUrl: string;
  fetchedAt: string;
  mobile: LighthouseResult;
  desktop: LighthouseResult;
};

export function isLighthouseSnapshot(r: LighthouseResult): r is LighthouseSnapshot {
  return !("error" in r && typeof (r as LighthouseError).error === "string");
}

export function isLighthouseDualBundle(raw: unknown): raw is LighthouseDualBundle {
  return (
    !!raw &&
    typeof raw === "object" &&
    (raw as LighthouseDualBundle).version === 2 &&
    "mobile" in (raw as object) &&
    "desktop" in (raw as object)
  );
}

function resolvePageSpeedApiKey(override?: string | null): string | undefined {
  const o = override?.trim();
  if (o) return o;
  return process.env.PAGESPEED_INSIGHTS_API_KEY?.trim() || undefined;
}

const PSI_KEY_HELP =
  "Add PageSpeed Insights API key: paste yours under Business profile (optional keys) or set PAGESPEED_INSIGHTS_API_KEY on the server (Google Cloud: enable PageSpeed Insights API).";

/** Run mobile and desktop Lighthouse in parallel (two PageSpeed API calls). */
export async function runPageSpeedLighthouseDual(
  pageUrl: string,
  apiKeyOverride?: string | null
): Promise<LighthouseDualBundle> {
  const psiWebUrl = buildPsiWebUrl(pageUrl);
  const fetchedAt = new Date().toISOString();
  const key = resolvePageSpeedApiKey(apiKeyOverride);
  if (!key) {
    const err: LighthouseError = {
      error: `Lighthouse scores need an API key. ${PSI_KEY_HELP}`,
      fetchedAt,
      psiWebUrl,
    };
    return { version: 2, psiWebUrl, fetchedAt, mobile: err, desktop: err };
  }
  const [mobile, desktop] = await Promise.all([
    runPageSpeedLighthouse(pageUrl, "mobile", apiKeyOverride),
    runPageSpeedLighthouse(pageUrl, "desktop", apiKeyOverride),
  ]);
  return { version: 2, psiWebUrl, fetchedAt, mobile, desktop };
}

function scoreFromCategory(cat: { score: number | null } | undefined): number | null {
  if (!cat || cat.score == null || Number.isNaN(cat.score)) return null;
  return Math.round(cat.score * 100);
}

function buildPsiWebUrl(url: string): string {
  const u = encodeURIComponent(url);
  return `https://pagespeed.web.dev/analysis?url=${u}`;
}

/** Errors where a desktop Lighthouse run sometimes succeeds when mobile hangs. */
function shouldRetryLighthouseWithDesktop(errorText: string): boolean {
  const u = errorText.toUpperCase();
  return (
    u.includes("PAGE_HUNG") ||
    u.includes("PAGE HUNG") ||
    u.includes("DEVTOOLSTIMEOUT") ||
    u.includes("PROTOCOL_TIMEOUT") ||
    u.includes("CHROME_INTERSTITIAL")
  );
}

function shouldTryAlternateHost(errorText: string): boolean {
  const u = errorText.toUpperCase();
  return (
    u.includes("PAGE_HUNG") ||
    u.includes("PAGE HUNG") ||
    u.includes("PROTOCOL_TIMEOUT") ||
    u.includes("DEVTOOLSTIMEOUT")
  );
}

/** Same path on www vs apex (e.g. oakwooduae.com ↔ www.oakwooduae.com) when the primary host hangs in lab. */
export function alternateHostUrls(pageUrl: string): string[] {
  try {
    const u = new URL(pageUrl);
    const h = u.hostname;
    const path = `${u.pathname}${u.search}`;
    if (h.startsWith("www.")) {
      const naked = h.slice(4);
      if (!naked) return [];
      return [`${u.protocol}//${naked}${path}`];
    }
    return [`${u.protocol}//www.${h}${path}`];
  } catch {
    return [];
  }
}

async function runMobileThenDesktop(
  pageUrl: string,
  psiWebUrl: string,
  apiKeyOverride?: string | null
): Promise<LighthouseResult> {
  const mobile = await runPageSpeedLighthouse(pageUrl, "mobile", apiKeyOverride);
  if (isLighthouseSnapshot(mobile)) return mobile;
  if (!shouldRetryLighthouseWithDesktop(mobile.error)) return mobile;
  const desktop = await runPageSpeedLighthouse(pageUrl, "desktop", apiKeyOverride);
  if (isLighthouseSnapshot(desktop)) return desktop;
  return {
    error: `Mobile: ${mobile.error} | Desktop: ${desktop.error}`,
    fetchedAt: desktop.fetchedAt,
    psiWebUrl,
  };
}

/**
 * Mobile first, then desktop on hang/timeouts; if still failing, retry with www ↔ non-www (same path).
 */
export async function runPageSpeedLighthouseBestEffort(
  pageUrl: string,
  apiKeyOverride?: string | null
): Promise<LighthouseResult> {
  const psiWebUrl = buildPsiWebUrl(pageUrl);
  let result = await runMobileThenDesktop(pageUrl, psiWebUrl, apiKeyOverride);
  if (isLighthouseSnapshot(result)) return result;
  if (!shouldTryAlternateHost(result.error)) return result;

  for (const alt of alternateHostUrls(pageUrl)) {
    if (alt === pageUrl) continue;
    const second = await runMobileThenDesktop(alt, psiWebUrl, apiKeyOverride);
    if (isLighthouseSnapshot(second)) return second;
    result = {
      error: `${result.error}\n\nAlso tried alternate host ${alt}: ${second.error}`,
      fetchedAt: second.fetchedAt,
      psiWebUrl,
    };
  }
  return result;
}

export async function runPageSpeedLighthouse(
  pageUrl: string,
  strategy: "mobile" | "desktop" = "mobile",
  apiKeyOverride?: string | null
): Promise<LighthouseResult> {
  const key = resolvePageSpeedApiKey(apiKeyOverride);
  const fetchedAt = new Date().toISOString();
  const psiWebUrl = buildPsiWebUrl(pageUrl);

  if (!key) {
    return {
      error: PSI_KEY_HELP,
      fetchedAt,
      psiWebUrl,
    };
  }

  const params = new URLSearchParams({
    url: pageUrl,
    key,
    strategy,
  });
  for (const c of ["PERFORMANCE", "SEO", "ACCESSIBILITY", "BEST_PRACTICES"]) {
    params.append("category", c);
  }

  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 120_000);
  let res: Response;
  try {
    res = await fetch(apiUrl, { signal: ctrl.signal, cache: "no-store" });
  } catch (e) {
    clearTimeout(t);
    const msg = e instanceof Error ? e.message : "Request failed";
    return { error: `PageSpeed request failed: ${msg}`, fetchedAt, psiWebUrl };
  } finally {
    clearTimeout(t);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail = text.slice(0, 600);
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      if (j?.error?.message) detail = j.error.message;
    } catch {
      /* keep raw slice */
    }
    return {
      error: `PageSpeed API ${res.status}: ${detail}`,
      fetchedAt,
      psiWebUrl,
    };
  }

  const data = (await res.json()) as {
    id?: string;
    lighthouseResult?: {
      categories?: Record<
        string,
        { score: number | null; title?: string }
      >;
      audits?: Record<
        string,
        {
          id?: string;
          title?: string;
          description?: string;
          displayValue?: string;
          score?: number | null;
          details?: { type?: string };
        }
      >;
    };
  };

  const lr = data.lighthouseResult;
  if (!lr?.categories) {
    return { error: "PageSpeed response missing Lighthouse data.", fetchedAt, psiWebUrl };
  }

  const c = lr.categories;
  const scores: LighthouseScores = {
    performance: scoreFromCategory(c.performance),
    seo: scoreFromCategory(c.seo),
    accessibility: scoreFromCategory(c.accessibility),
    bestPractices: scoreFromCategory(c["best-practices"] ?? c.best_practices),
  };

  const opportunities: LighthouseOpportunity[] = [];
  const audits = lr.audits || {};
  for (const a of Object.values(audits)) {
    if (!a?.title) continue;
    if (a.details?.type !== "opportunity") continue;
    if (a.score == null || a.score >= 0.9) continue;
    opportunities.push({
      id: String(a.id || a.title),
      title: a.title,
      description: (a.description || "").replace(/<[^>]+>/g, " ").slice(0, 280),
      displayValue: a.displayValue,
    });
    if (opportunities.length >= 6) break;
  }

  return {
    strategy,
    fetchedAt,
    scores,
    opportunities,
    finalUrl: typeof data.id === "string" ? data.id : undefined,
    psiWebUrl,
  };
}

/** Short text for Gemini so the narrative matches measured Lighthouse data. */
export function lighthouseSummaryForPrompt(s: LighthouseSnapshot): string {
  const { scores, opportunities } = s;
  const strat = s.strategy === "desktop" ? "Desktop" : "Mobile";
  const parts = [
    `${strat} Lighthouse scores (0 to 100): performance ${scores.performance ?? "n/a"}, SEO ${scores.seo ?? "n/a"}, accessibility ${scores.accessibility ?? "n/a"}, best practices ${scores.bestPractices ?? "n/a"}.`,
  ];
  if (opportunities.length) {
    parts.push(
      "Top opportunities from Lighthouse: " +
        opportunities.map((o) => `${o.title}${o.displayValue ? ` (${o.displayValue})` : ""}`).join("; ")
    );
  }
  return parts.join(" ");
}

function lighthouseErrorLine(label: string, r: LighthouseResult): string {
  if (isLighthouseSnapshot(r)) return "";
  return `${label}: ${r.error}`;
}

/** Merge mobile + desktop lab summaries for the AI audit prompt. */
export function lighthouseDualSummaryForPrompt(bundle: LighthouseDualBundle): string {
  const parts: string[] = [];
  if (isLighthouseSnapshot(bundle.mobile)) parts.push(lighthouseSummaryForPrompt(bundle.mobile));
  if (isLighthouseSnapshot(bundle.desktop)) parts.push(lighthouseSummaryForPrompt(bundle.desktop));
  if (parts.length > 0) return parts.join("\n\n");
  const errBits = [lighthouseErrorLine("Mobile", bundle.mobile), lighthouseErrorLine("Desktop", bundle.desktop)].filter(
    Boolean
  );
  return errBits.length ? `Lighthouse unavailable.\n${errBits.join("\n")}` : "Lighthouse data not available.";
}
