import type { PageSignals } from "@/lib/page-fetch-audit";
import { normalizeWebsiteUrl } from "@/lib/url-normalize";
import { gscQueryKey } from "@/lib/gsc-query-key";

/** Stored on CompetitorWatch.snapshot / priorSnapshot. */
export type CompetitorSnapshotStored = {
  fetchedAt: string;
  title?: string;
  metaDescription?: string;
  h1Count: number;
  statusCode?: number;
  finalUrl?: string;
  ok: boolean;
  fetchError?: string;
};

export function competitorStorageKey(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return gscQueryKey("");
  try {
    const u = new URL(normalizeWebsiteUrl(trimmed));
    const path = u.pathname.replace(/\/+$/, "") || "/";
    const key = `${u.hostname.toLowerCase()}${path}`;
    return gscQueryKey(key);
  } catch {
    return gscQueryKey(trimmed.toLowerCase());
  }
}

export function snapshotFromPageSignals(s: PageSignals): CompetitorSnapshotStored {
  return {
    fetchedAt: new Date().toISOString(),
    title: s.title,
    metaDescription: s.metaDescription,
    h1Count: s.h1Texts.length,
    statusCode: s.statusCode,
    finalUrl: s.finalUrl,
    ok: s.ok,
    fetchError: s.fetchError,
  };
}
