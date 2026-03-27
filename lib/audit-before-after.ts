import type { SiteAudit } from "@prisma/client";
import { isLighthouseDualBundle, isLighthouseSnapshot } from "@/lib/pagespeed-lighthouse";

export type LabScoreSet = {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
};

const METRIC_LABELS: { key: keyof LabScoreSet; label: string }[] = [
  { key: "performance", label: "Performance" },
  { key: "seo", label: "SEO" },
  { key: "accessibility", label: "Accessibility" },
  { key: "bestPractices", label: "Best practices" },
];

export function lighthouseScoresFromPayload(
  raw: unknown,
  preferMobile: boolean
): LabScoreSet | null {
  if (!raw || typeof raw !== "object") return null;
  if (isLighthouseDualBundle(raw)) {
    const primary = preferMobile ? raw.mobile : raw.desktop;
    const fallback = preferMobile ? raw.desktop : raw.mobile;
    if (isLighthouseSnapshot(primary)) return primary.scores;
    if (isLighthouseSnapshot(fallback)) return fallback.scores;
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.error === "string") return null;
  const scores = o.scores as LabScoreSet | undefined;
  if (!scores || typeof scores !== "object") return null;
  return scores;
}

export function opportunityIndexFromDeliverables(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  return typeof d.opportunityIndex === "number" ? Math.round(d.opportunityIndex) : null;
}

export type AuditProgressModel = {
  hasComparison: boolean;
  firstAt: string | null;
  latestAt: string | null;
  lighthouseFirst: LabScoreSet | null;
  lighthouseLatest: LabScoreSet | null;
  opportunityFirst: number | null;
  opportunityLatest: number | null;
  metricRows: {
    key: keyof LabScoreSet;
    label: string;
    first: number | null;
    latest: number | null;
    delta: number | null;
  }[];
  opportunityDelta: number | null;
};

export function buildAuditProgressCompare(first: SiteAudit | null, latest: SiteAudit | null): AuditProgressModel {
  if (!first || !latest || first.id === latest.id) {
    return {
      hasComparison: false,
      firstAt: first?.createdAt.toISOString() ?? null,
      latestAt: latest?.createdAt.toISOString() ?? null,
      lighthouseFirst: first ? lighthouseScoresFromPayload(first.lighthouse, true) : null,
      lighthouseLatest: latest ? lighthouseScoresFromPayload(latest.lighthouse, true) : null,
      opportunityFirst: first ? opportunityIndexFromDeliverables(first.deliverables) : null,
      opportunityLatest: latest ? opportunityIndexFromDeliverables(latest.deliverables) : null,
      metricRows: [],
      opportunityDelta: null,
    };
  }

  const lighthouseFirst = lighthouseScoresFromPayload(first.lighthouse, true);
  const lighthouseLatest = lighthouseScoresFromPayload(latest.lighthouse, true);
  const opportunityFirst = opportunityIndexFromDeliverables(first.deliverables);
  const opportunityLatest = opportunityIndexFromDeliverables(latest.deliverables);

  const metricRows = METRIC_LABELS.map(({ key, label }) => {
    const a = lighthouseFirst?.[key] ?? null;
    const b = lighthouseLatest?.[key] ?? null;
    const delta = a != null && b != null ? b - a : null;
    return { key, label, first: a, latest: b, delta };
  });

  const opportunityDelta =
    opportunityFirst != null && opportunityLatest != null ? opportunityLatest - opportunityFirst : null;

  return {
    hasComparison: true,
    firstAt: first.createdAt.toISOString(),
    latestAt: latest.createdAt.toISOString(),
    lighthouseFirst,
    lighthouseLatest,
    opportunityFirst,
    opportunityLatest,
    metricRows,
    opportunityDelta,
  };
}
