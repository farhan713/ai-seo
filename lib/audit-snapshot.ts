import type { PageSignals } from "@/lib/page-fetch-audit";

/** Stored on SiteAudit for dashboard “live intel” without huge HTML. */
export type AuditPageSnapshot = {
  primary: {
    ok: boolean;
    statusCode?: number;
    title?: string;
    metaDescription?: string;
    h1Count: number;
    canonicalHref?: string;
    ogTitle?: string;
  };
  competitor: {
    url?: string;
    ok: boolean;
    statusCode?: number;
    title?: string;
    metaDescription?: string;
    h1Count: number;
    canonicalHref?: string;
    ogTitle?: string;
  } | null;
};

export function slimPageSnapshot(
  primary: PageSignals,
  competitorUrl: string | undefined,
  competitor: PageSignals | null
): AuditPageSnapshot {
  return {
    primary: {
      ok: primary.ok,
      statusCode: primary.statusCode,
      title: primary.title,
      metaDescription: primary.metaDescription,
      h1Count: primary.h1Texts.length,
      canonicalHref: primary.canonicalHref,
      ogTitle: primary.ogTitle,
    },
    competitor: competitor
      ? {
          url: competitorUrl,
          ok: competitor.ok && !competitor.fetchError,
          statusCode: competitor.statusCode,
          title: competitor.title,
          metaDescription: competitor.metaDescription,
          h1Count: competitor.h1Texts.length,
          canonicalHref: competitor.canonicalHref,
          ogTitle: competitor.ogTitle,
        }
      : null,
  };
}
