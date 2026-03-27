import { prisma } from "@/lib/prisma";
import { planLabel, hasGrowthFeatures } from "@/lib/plan-access";
import { computeGrowthScoreV1 } from "@/lib/growth-score";
import { countBlogsThisWeek } from "@/lib/blog-service";
import { buildAuditProgressCompare } from "@/lib/audit-before-after";

export type ReportShareSnapshotV1 = {
  version: 1;
  generatedAt: string;
  businessName: string | null;
  planLabel: string;
  growthScore: number | null;
  growthScoreVersion: number | null;
  auditSummary: string | null;
  lastAuditAt: string | null;
  keywordsTracked: number;
  auditProgressSummary: string | null;
};

export async function buildReportShareSnapshot(userId: string): Promise<ReportShareSnapshotV1> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { businessName: true },
  });

  const growth = sub && hasGrowthFeatures(sub.plan);
  const [firstAudit, latestAudit, checklists, kwCount, blogsThisWeek] = await Promise.all([
    prisma.siteAudit.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.siteAudit.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.onPageChecklist.findMany({ where: { userId }, select: { tasks: true } }),
    prisma.trackedKeyword.count({ where: { userId } }),
    growth ? countBlogsThisWeek(userId) : Promise.resolve(0),
  ]);

  const score =
    sub != null
      ? computeGrowthScoreV1({
          firstAudit,
          latestAudit,
          checklistRows: checklists,
          blogsThisWeek,
          hasGrowthPlan: !!growth,
        })
      : null;

  const progress =
    firstAudit && latestAudit ? buildAuditProgressCompare(firstAudit, latestAudit) : null;
  let auditProgressSummary: string | null = null;
  if (progress?.hasComparison && progress.metricRows.length) {
    const deltas = progress.metricRows
      .filter((r) => r.delta != null && r.delta !== 0)
      .map((r) => `${r.label}: ${r.first} to ${r.latest} (${r.delta! > 0 ? "+" : ""}${r.delta})`);
    auditProgressSummary = deltas.length ? deltas.join(" · ") : "Metrics recorded; no score deltas yet.";
  } else if (latestAudit) {
    auditProgressSummary = "First audit on file. Run again later to unlock before/after.";
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    businessName: user?.businessName ?? null,
    planLabel: sub ? planLabel(sub.plan) : "No active plan",
    growthScore: score?.total ?? null,
    growthScoreVersion: score?.version ?? null,
    auditSummary: latestAudit?.summary ?? null,
    lastAuditAt: latestAudit?.createdAt.toISOString() ?? null,
    keywordsTracked: kwCount,
    auditProgressSummary,
  };
}
