import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { countBlogsThisWeek } from "@/lib/blog-service";
import {
  hasAuditAccess,
  hasGrowthFeatures,
  hasSocialAutomation,
  planLabel,
} from "@/lib/plan-access";
import { buildAuditProgressCompare } from "@/lib/audit-before-after";
import { AuditProgressCard } from "@/components/audit-progress-card";
import { GrowthScoreCard } from "@/components/growth-score-card";
import { computeGrowthScoreV1 } from "@/lib/growth-score";
import Link from "next/link";
import { redirect } from "next/navigation";

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getUTCDay();
  const diff = (day + 6) % 7;
  x.setUTCDate(x.getUTCDate() - diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export default async function DashboardHome() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const weekStart = startOfWeek(new Date());

  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  const growth = sub && hasGrowthFeatures(sub.plan);
  const batch = sub?.backlinkBatch ?? 1;

  const [blogsThisWeek, recentBlogs, backlinkStats, recentBacklinks, firstAudit, latestAudit, checklistRows] =
    await Promise.all([
    growth ? countBlogsThisWeek(userId) : Promise.resolve(0),
    growth
      ? prisma.blog.findMany({
          where: { userId },
          orderBy: { generatedAt: "desc" },
          take: 5,
          select: { id: true, title: true, status: true, generatedAt: true },
        })
      : Promise.resolve([]),
    growth
      ? prisma.backlink.groupBy({
          by: ["status"],
          where: { userId, batch },
          _count: true,
        })
      : Promise.resolve([]),
    growth
      ? prisma.backlink.findMany({
          where: { userId, batch, status: { not: "PENDING" } },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: { directoryName: true, status: true, updatedAt: true },
        })
      : Promise.resolve([]),
    sub && hasAuditAccess(sub.plan)
      ? prisma.siteAudit.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } })
      : Promise.resolve(null),
    sub && hasAuditAccess(sub.plan)
      ? prisma.siteAudit.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } })
      : Promise.resolve(null),
    sub && hasAuditAccess(sub.plan)
      ? prisma.onPageChecklist.findMany({ where: { userId }, select: { tasks: true } })
      : Promise.resolve([]),
  ]);

  const submitted = backlinkStats.find((s) => s.status === "SUBMITTED")?._count ?? 0;
  const verified = backlinkStats.find((s) => s.status === "VERIFIED")?._count ?? 0;
  const done = submitted + verified;

  const auditSummaryText = latestAudit?.summary ?? "";
  const auditSummaryPreview =
    auditSummaryText.length > 0
      ? `${auditSummaryText.slice(0, 120)}${auditSummaryText.length > 120 ? "…" : ""}`
      : null;

  const auditProgress =
    sub && hasAuditAccess(sub.plan) && (firstAudit || latestAudit)
      ? buildAuditProgressCompare(firstAudit, latestAudit)
      : null;

  const growthScoreModel =
    sub && hasAuditAccess(sub.plan)
      ? computeGrowthScoreV1({
          firstAudit,
          latestAudit,
          checklistRows,
          blogsThisWeek,
          hasGrowthPlan: !!growth,
        })
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Overview</h1>
        <p className="mt-1 text-sm text-muted">
          {sub
            ? `Active plan: ${planLabel(sub.plan)}. Use the sidebar for tools included in your plan.`
            : "No active plan yet. Your admin will assign one."}
        </p>
      </div>

      {sub && hasAuditAccess(sub.plan) && (
        <div className="space-y-4">
          <div className="rounded-xl border border-accent/30 bg-cyan-50/50 p-4 text-sm text-slate-800">
            <strong>Site audit</strong> checks keywords, meta tags, and common on-page issues for your website URL.{" "}
            <Link href="/dashboard/audit" className="font-medium text-primary hover:underline">
              Open Site audit →
            </Link>
            {latestAudit ? (
              <span className="mt-2 block text-xs text-muted">
                Last run {latestAudit.createdAt.toLocaleString()}
                {auditSummaryPreview ? `: ${auditSummaryPreview}` : null}
              </span>
            ) : null}
          </div>
          {auditProgress ? <AuditProgressCard model={auditProgress} /> : null}
          {growthScoreModel ? <GrowthScoreCard model={growthScoreModel} /> : null}
        </div>
      )}

      {growth ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm">
            <div className="text-sm font-medium text-muted">Blogs this week</div>
            <div className="mt-2 text-3xl font-semibold text-primary">{blogsThisWeek}</div>
            <p className="mt-1 text-xs text-muted">Up to {sub!.blogsPerWeek}/week · resets Monday UTC</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm">
            <div className="text-sm font-medium text-muted">Backlinks (this batch)</div>
            <div className="mt-2 text-3xl font-semibold text-primary">{done}</div>
            <p className="mt-1 text-xs text-muted">Submitted or verified · batch #{batch}</p>
            {sub!.backlinkBatchDone && sub!.nextBacklinkBatchAt ? (
              <p className="mt-2 text-xs text-accent">
                Next checklist unlocks {sub!.nextBacklinkBatchAt.toLocaleString()}
              </p>
            ) : null}
          </div>
          <div className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm sm:col-span-2 lg:col-span-1">
            <div className="text-sm font-medium text-muted">Week window</div>
            <div className="mt-2 text-sm text-slate-700">
              Started {weekStart.toLocaleDateString(undefined, { dateStyle: "medium" })}
            </div>
            <Link
              href="/dashboard/blogs"
              className="mt-3 inline-flex text-sm font-medium text-accent hover:underline"
            >
              View all blogs →
            </Link>
          </div>
        </div>
      ) : sub ? (
        <div className="rounded-xl border border-slate-200 bg-card p-6 text-sm text-muted shadow-sm">
          Your Starter plan includes the <strong>Site audit</strong> only. Upgrade to Growth or Elite for AI blogs and
          the backlink workflow.
        </div>
      ) : null}

      {sub && hasSocialAutomation(sub.plan) && (
        <div className="rounded-xl border border-slate-200 bg-card p-4 text-sm shadow-sm">
          <strong>Elite:</strong> Connect Instagram and Facebook tokens under{" "}
          <Link href="/dashboard/social" className="font-medium text-primary hover:underline">
            Social ads
          </Link>
          . Daily ad drafts can be generated from the admin panel. Posting to Meta requires your Meta app and
          permissions.
        </div>
      )}

      {growth ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-card shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Recent blogs</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {recentBlogs.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-muted">No blogs yet.</li>
              ) : (
                recentBlogs.map((b) => (
                  <li key={b.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <Link
                        href={`/dashboard/blogs/${b.id}`}
                        className="font-medium text-slate-800 hover:text-primary"
                      >
                        {b.title}
                      </Link>
                      <div className="text-xs text-muted">
                        {b.generatedAt.toLocaleDateString()} · {b.status}
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-card shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Backlink activity</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {recentBacklinks.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-muted">No submissions yet.</li>
              ) : (
                recentBacklinks.map((b, i) => (
                  <li key={i} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-slate-800">{b.directoryName}</span>
                    <span className="text-xs font-medium text-accent">{b.status}</span>
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-slate-100 px-5 py-3">
              <Link href="/dashboard/backlinks" className="text-sm font-medium text-accent hover:underline">
                Manage backlinks →
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
