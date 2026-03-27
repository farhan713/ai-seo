import type { PageSignals } from "@/lib/page-fetch-audit";

export type CrawlIssueSeverity = "error" | "warning" | "notice";

export type CrawlIssue = {
  id: string;
  severity: CrawlIssueSeverity;
  title: string;
  detail: string;
};

export function computeCrawlIssues(s: PageSignals, pageUrl: string): CrawlIssue[] {
  const issues: CrawlIssue[] = [];

  if (s.fetchError) {
    issues.push({
      id: "fetch_failed",
      severity: "error",
      title: "Could not fetch page",
      detail: s.fetchError,
    });
    return issues;
  }

  const code = s.statusCode ?? 0;
  if (code >= 400) {
    issues.push({
      id: "http_error",
      severity: "error",
      title: `HTTP ${code}`,
      detail: "Search engines and users may not reach this URL.",
    });
  } else if (code >= 300 && code < 400) {
    issues.push({
      id: "redirect",
      severity: "notice",
      title: `HTTP ${code} redirect`,
      detail: `Final URL after redirects: ${s.finalUrl || pageUrl}`,
    });
  }

  if (code === 200 || (code >= 200 && code < 300)) {
    const t = s.title?.trim() || "";
    if (!t) {
      issues.push({
        id: "missing_title",
        severity: "error",
        title: "Missing page title",
        detail: "HTML <title> is empty or missing. Critical for SERP and browser tabs.",
      });
    } else {
      if (t.length < 15) {
        issues.push({
          id: "title_short",
          severity: "warning",
          title: "Title may be too short",
          detail: `Length ${t.length}. Aim for a descriptive title that reflects the page (often 30 to 60 characters).`,
        });
      }
      if (t.length > 60) {
        issues.push({
          id: "title_long",
          severity: "warning",
          title: "Title may be truncated in search",
          detail: `Length ${t.length}. Google often shows about 50 to 60 characters.`,
        });
      }
    }

    const d = s.metaDescription?.trim() || "";
    if (!d) {
      issues.push({
        id: "missing_meta_description",
        severity: "warning",
        title: "Missing meta description",
        detail: "Add a unique meta description to improve snippet quality and CTR.",
      });
    } else {
      if (d.length < 50) {
        issues.push({
          id: "meta_short",
          severity: "notice",
          title: "Meta description quite short",
          detail: `Length ${d.length}. Consider expanding to ~120 to 155 characters with a clear value proposition.`,
        });
      }
      if (d.length > 160) {
        issues.push({
          id: "meta_long",
          severity: "warning",
          title: "Meta description may truncate",
          detail: `Length ${d.length}. Many snippets clip around 150 to 160 characters.`,
        });
      }
    }

    const h1 = s.h1Texts.length;
    if (h1 === 0) {
      issues.push({
        id: "missing_h1",
        severity: "error",
        title: "No H1 heading",
        detail: "Add one clear H1 that states the main topic of the page.",
      });
    } else if (h1 > 1) {
      issues.push({
        id: "multiple_h1",
        severity: "warning",
        title: "Multiple H1 elements",
        detail: `Found ${h1}. One primary H1 is easier for users and SEO to parse.`,
      });
    }

    if (!s.canonicalHref) {
      issues.push({
        id: "missing_canonical",
        severity: "notice",
        title: "No canonical link",
        detail: "Consider a rel=canonical tag to consolidate duplicate URLs when relevant.",
      });
    }

    if (!s.ogTitle) {
      issues.push({
        id: "missing_og_title",
        severity: "notice",
        title: "Missing og:title",
        detail: "Open Graph tags improve how links look when shared on social platforms.",
      });
    }
  }

  return issues;
}

export type CrawlStats = {
  errors: number;
  warnings: number;
  notices: number;
  healthy: number;
  broken: number;
  redirect: number;
  blocked: number;
};

export function aggregateStats(
  pages: { ok: boolean; statusCode: number | null; issues: CrawlIssue[] }[]
): CrawlStats {
  let errors = 0;
  let warnings = 0;
  let notices = 0;
  let healthy = 0;
  let broken = 0;
  let redirect = 0;
  let blocked = 0;

  for (const p of pages) {
    const code = p.statusCode ?? 0;
    if (code === 403 || code === 401) blocked += 1;
    else if (code >= 400) broken += 1;
    else if (code >= 300 && code < 400) redirect += 1;
    else if (code >= 200 && code < 300) {
      const hasError = p.issues.some((i) => i.severity === "error");
      if (!hasError) healthy += 1;
    }

    for (const i of p.issues) {
      if (i.severity === "error") errors += 1;
      else if (i.severity === "warning") warnings += 1;
      else notices += 1;
    }
  }

  return { errors, warnings, notices, healthy, broken, redirect, blocked };
}
