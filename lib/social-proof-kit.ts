import type { AuditProgressModel } from "@/lib/audit-before-after";

/**
 * Phase 4 F14 — short social lines that quote measurable movement only (honest F18).
 * Returns empty when there is no before/after or no numeric deltas.
 */
export function buildSocialProofLines(progress: AuditProgressModel | null): string[] {
  if (!progress?.hasComparison) return [];

  const lines: string[] = [];

  for (const row of progress.metricRows) {
    if (row.delta == null || row.delta === 0) continue;
    if (row.first == null || row.latest == null) continue;
    const dir = row.delta > 0 ? "up" : "down";
    const abs = Math.abs(row.delta);
    lines.push(
      `${row.label}: moved from ${row.first} to ${row.latest} (${dir} ${abs} points on lab scores).`
    );
  }

  if (progress.opportunityDelta != null && progress.opportunityDelta !== 0) {
    const o = progress.opportunityDelta;
    lines.push(
      `SEO opportunity index ${o > 0 ? "improved" : "shifted"} by ${Math.abs(o)} points between your first and latest audits.`
    );
  }

  return lines.slice(0, 5);
}
