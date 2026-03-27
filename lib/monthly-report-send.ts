import { prisma } from "@/lib/prisma";
import {
  hasGrowthFeatures,
  hasMonthlyReportPdfAttachment,
  planLabel,
} from "@/lib/plan-access";
import { aggregateChecklistCompletionPercent, computeGrowthScoreV1 } from "@/lib/growth-score";
import { countBlogsThisWeek } from "@/lib/blog-service";
import { buildMonthlyReportPdfBuffer } from "@/lib/monthly-report-pdf";

const MIN_DAYS_BETWEEN = 28;

function daysSince(d: Date | null): number {
  if (!d) return 999;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
}

export function buildMonthlyReportHtml(input: {
  name: string;
  businessName: string | null;
  planLabel: string;
  growthScore: number;
  scoreVersion: number;
  lastAuditAt: string | null;
  keywordsTracked: number;
  checklistCompletionPct: number;
  blogsThisWeek: number;
  competitorsTracked: number;
  dashboardUrl: string;
}): string {
  const brand = input.businessName || "your site";
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;">
  <h1 style="font-size:20px;">Monthly growth brief</h1>
  <p style="color:#64748b;">${brand} · ${input.planLabel}</p>
  <p>Hi ${escapeHtml(input.name)}, here is your scheduled snapshot from the AI SEO Tool dashboard.</p>
  <ul>
    <li><strong>Unified growth score (v${input.scoreVersion}):</strong> ${input.growthScore} / 100</li>
    <li><strong>Last site audit:</strong> ${input.lastAuditAt ?? "Not run yet"}</li>
    <li><strong>Keywords tracked:</strong> ${input.keywordsTracked}</li>
    <li><strong>On-page checklist completion (avg):</strong> ${input.checklistCompletionPct}%</li>
    <li><strong>Blogs generated this week:</strong> ${input.blogsThisWeek}</li>
    <li><strong>Competitor URLs saved:</strong> ${input.competitorsTracked}</li>
  </ul>
  <p><a href="${input.dashboardUrl}" style="color:#0d9488;">Open dashboard</a> for full audits, calendar, and checklists.</p>
  <p style="font-size:12px;color:#94a3b8;">You opted in under Business profile. Reply to your agency to adjust frequency or unsubscribe.</p>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendMonthlyReportForUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!apiKey || !from) {
    return { ok: false, error: "RESEND_API_KEY or RESEND_FROM_EMAIL not configured" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      businessName: true,
      monthlyExecutiveReportOptIn: true,
      lastMonthlyReportSentAt: true,
    },
  });
  if (!user?.monthlyExecutiveReportOptIn) {
    return { ok: false, error: "opt-in off" };
  }

  if (daysSince(user.lastMonthlyReportSentAt) < MIN_DAYS_BETWEEN) {
    return { ok: false, error: "too soon" };
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE", plan: { in: ["GROWTH_899", "ELITE_1599"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!sub) {
    return { ok: false, error: "no growth+ sub" };
  }

  const [firstAudit, latestAudit, checklists, kwCount, compCount, blogsThisWeek] = await Promise.all([
    prisma.siteAudit.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.siteAudit.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.onPageChecklist.findMany({ where: { userId }, select: { tasks: true } }),
    prisma.trackedKeyword.count({ where: { userId } }),
    prisma.competitorWatch.count({ where: { userId } }),
    hasGrowthFeatures(sub.plan) ? countBlogsThisWeek(userId) : Promise.resolve(0),
  ]);

  const growth = computeGrowthScoreV1({
    firstAudit,
    latestAudit,
    checklistRows: checklists,
    blogsThisWeek,
    hasGrowthPlan: hasGrowthFeatures(sub.plan),
  });

  const lastAuditAt = latestAudit?.createdAt
    ? latestAudit.createdAt.toLocaleDateString(undefined, { dateStyle: "medium" })
    : null;

  const dashboardUrl = `${appUrl.replace(/\/$/, "")}/dashboard`;

  const checklistPct = aggregateChecklistCompletionPercent(checklists);

  const html = buildMonthlyReportHtml({
    name: user.name,
    businessName: user.businessName,
    planLabel: planLabel(sub.plan),
    growthScore: growth.total,
    scoreVersion: growth.version,
    lastAuditAt,
    keywordsTracked: kwCount,
    checklistCompletionPct: checklistPct,
    blogsThisWeek,
    competitorsTracked: compCount,
    dashboardUrl,
  });

  const pdfLines = [
    `Monthly growth brief — ${user.businessName || "Your business"}`,
    `Plan: ${planLabel(sub.plan)}`,
    `Unified growth score (v${growth.version}): ${growth.total} / 100`,
    `Last site audit: ${lastAuditAt ?? "Not run yet"}`,
    `Keywords tracked: ${kwCount}`,
    `Checklist completion: ${checklistPct}%`,
    `Blogs this week: ${blogsThisWeek}`,
    `Competitors saved: ${compCount}`,
    "",
    "Open your live dashboard for full detail and copy-ready deliverables.",
  ];

  const attachPdf = hasMonthlyReportPdfAttachment(sub.plan);
  let attachments: { filename: string; content: string }[] | undefined;
  if (attachPdf) {
    const buf = await buildMonthlyReportPdfBuffer({
      title: `Growth score ${growth.total} / 100`,
      lines: pdfLines,
    });
    attachments = [{ filename: "monthly-growth-brief.pdf", content: buf.toString("base64") }];
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [user.email],
      subject: `Monthly growth brief — score ${growth.total}/100`,
      html,
      attachments,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return { ok: false, error: errText || `Resend ${res.status}` };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { lastMonthlyReportSentAt: new Date() },
  });

  return { ok: true };
}
