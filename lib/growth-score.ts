import type { SiteAudit } from "@prisma/client";
import { lighthouseScoresFromPayload, opportunityIndexFromDeliverables } from "@/lib/audit-before-after";

/**
 * Growth score formula v1 — keep in sync with dashboard UI and docs/phases/phase-4-scale-differentiation.md.
 *
 * Total is 0–100 (rounded). Four bands:
 * - Lighthouse SEO (mobile): 35% of the latest lab SEO score (0–100), or 55 imputed when missing.
 * - Opportunity index: 30% of latest audit deliverables opportunityIndex (0–100), or 50 imputed.
 * - Momentum: up to 20 points from first-vs-latest trajectory (average of SEO score delta and opportunity delta, scaled).
 * - Execution: up to 15 points from on-page checklist completion (10 max) plus up to 5 for Growth/Elite blog cadence vs a soft target.
 *
 * Keyword / Search Console trend is intentionally neutral in v1 (reserved for a later formula version).
 */
export const GROWTH_SCORE_FORMULA_VERSION = 1;

export type GrowthScoreBand = {
  id: string;
  label: string;
  points: number;
  maxPoints: number;
  detail: string;
};

export type GrowthScoreResult = {
  version: number;
  total: number;
  bands: GrowthScoreBand[];
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function severityPressure(findings: unknown): number {
  if (!Array.isArray(findings)) return 0;
  let high = 0;
  let med = 0;
  for (const f of findings) {
    if (!f || typeof f !== "object") continue;
    const s = String((f as { severity?: string }).severity || "").toLowerCase();
    if (s.includes("high")) high++;
    else if (s.includes("medium")) med++;
  }
  return Math.min(8, high * 2 + med * 0.5);
}

export function aggregateChecklistCompletionPercent(rows: { tasks: unknown }[]): number {
  let done = 0;
  let total = 0;
  for (const row of rows) {
    const tasks = row.tasks;
    if (!Array.isArray(tasks)) continue;
    for (const t of tasks) {
      if (!t || typeof t !== "object") continue;
      const d = (t as { done?: boolean }).done === true;
      total++;
      if (d) done++;
    }
  }
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

export function computeGrowthScoreV1(input: {
  firstAudit: SiteAudit | null;
  latestAudit: SiteAudit | null;
  checklistRows: { tasks: unknown }[];
  blogsThisWeek: number;
  hasGrowthPlan: boolean;
}): GrowthScoreResult {
  const latest = input.latestAudit;
  const first = input.firstAudit;

  const seoLatest = lighthouseScoresFromPayload(latest?.lighthouse ?? null, true)?.seo ?? null;
  const seoFirst = lighthouseScoresFromPayload(first?.lighthouse ?? null, true)?.seo ?? null;
  const oppLatest = latest ? opportunityIndexFromDeliverables(latest.deliverables) : null;
  const oppFirst = first ? opportunityIndexFromDeliverables(first.deliverables) : null;

  const imputedSeo = 55;
  const imputedOpp = 50;

  const seoForScore = seoLatest ?? imputedSeo;
  const oppForScore = oppLatest ?? imputedOpp;

  const lighthouseBand = (seoForScore / 100) * 35;
  const opportunityBand = (oppForScore / 100) * 30;

  let momentumBand = 10;
  let momentumDetail = "Run a second audit to unlock momentum scoring from your trajectory.";
  const hasPair = first && latest && first.id !== latest.id;
  if (hasPair && seoLatest != null && seoFirst != null && oppLatest != null && oppFirst != null) {
    const dSeo = clamp(seoLatest - seoFirst, -40, 40) / 40;
    const dOpp = clamp(oppLatest - oppFirst, -40, 40) / 40;
    const blend = (dSeo + dOpp) / 2;
    momentumBand = clamp(10 + blend * 10, 0, 20);
    momentumDetail = "Blended first-to-latest movement in lab SEO and opportunity index.";
  } else if (hasPair) {
    momentumDetail = "Partial history: older runs may lack scores; momentum uses available deltas.";
    const parts: number[] = [];
    if (seoLatest != null && seoFirst != null) {
      parts.push(clamp(10 + (clamp(seoLatest - seoFirst, -40, 40) / 40) * 10, 0, 20));
    }
    if (oppLatest != null && oppFirst != null) {
      parts.push(clamp(10 + (clamp(oppLatest - oppFirst, -40, 40) / 40) * 10, 0, 20));
    }
    if (parts.length) momentumBand = parts.reduce((a, b) => a + b, 0) / parts.length;
  }

  const checklistPct = aggregateChecklistCompletionPercent(input.checklistRows);
  const checklistPoints = (checklistPct / 100) * 10;

  const blogTarget = input.hasGrowthPlan ? 2 : 0;
  const blogPoints =
    input.hasGrowthPlan && blogTarget > 0
      ? clamp((input.blogsThisWeek / blogTarget) * 5, 0, 5)
      : 0;

  const executionBand = checklistPoints + blogPoints;
  const executionDetail = input.hasGrowthPlan
    ? `${checklistPct}% checklist completion · ${input.blogsThisWeek} blog(s) this week vs soft target ${blogTarget}.`
    : `${checklistPct}% checklist completion (blogs excluded on Starter).`;

  const severityDeduction = latest?.findings ? severityPressure(latest.findings) : 0;
  const total = clamp(
    lighthouseBand + opportunityBand + momentumBand + executionBand - severityDeduction,
    0,
    100
  );

  const rounded = Math.round(total);

  const bands: GrowthScoreBand[] = [
    {
      id: "lighthouse",
      label: "Lab SEO (Lighthouse)",
      points: Math.round(lighthouseBand * 10) / 10,
      maxPoints: 35,
      detail:
        seoLatest != null
          ? `Latest mobile SEO score ${seoLatest}/100 (35% weight).`
          : `No lab SEO score on latest audit; imputed baseline ${imputedSeo} (35% weight).`,
    },
    {
      id: "opportunity",
      label: "Opportunity index",
      points: Math.round(opportunityBand * 10) / 10,
      maxPoints: 30,
      detail:
        oppLatest != null
          ? `Latest opportunity index ${oppLatest}/100 (30% weight).`
          : `No opportunity index; imputed ${imputedOpp} (30% weight).`,
    },
    {
      id: "momentum",
      label: "Momentum",
      points: Math.round(momentumBand * 10) / 10,
      maxPoints: 20,
      detail: momentumDetail,
    },
    {
      id: "execution",
      label: "Execution",
      points: Math.round(executionBand * 10) / 10,
      maxPoints: 15,
      detail: executionDetail,
    },
  ];

  if (severityDeduction > 0) {
    bands.push({
      id: "severity",
      label: "Open findings pressure",
      points: -Math.round(severityDeduction * 10) / 10,
      maxPoints: 8,
      detail: "Small deduction when the latest audit still lists high-severity issues (capped at 8 points).",
    });
  }

  return {
    version: GROWTH_SCORE_FORMULA_VERSION,
    total: rounded,
    bands,
  };
}
