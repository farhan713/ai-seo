import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasAuditAccess } from "@/lib/plan-access";
import { getSearchConsoleRedirectUri, searchConsoleOAuthConfigured } from "@/lib/search-console-google";
import SearchPerformanceClient from "./search-performance-client";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function SearchPerformancePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!sub || !hasAuditAccess(sub.plan)) {
    return (
      <div className="rounded-xl border border-slate-200 bg-card p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Search performance</h1>
        <p className="mt-2 text-sm text-muted">
          An active Starter, Growth, or Elite plan is required for Search Console insights.
        </p>
      </div>
    );
  }

  const conn = await prisma.searchConsoleConnection.findUnique({
    where: { userId: session.user.id },
    select: {
      siteUrl: true,
      lastSyncAt: true,
      lastSyncError: true,
      periodStart: true,
      periodEnd: true,
    },
  });

  const queries = conn
    ? await prisma.gscQueryRow.findMany({
        where: { userId: session.user.id },
        orderBy: [{ clicks: "desc" }, { impressions: "desc" }],
        take: 100,
        select: { query: true, clicks: true, impressions: true, ctr: true, position: true },
      })
    : [];

  const connectionPayload = conn
    ? {
        siteUrl: conn.siteUrl,
        lastSyncAt: conn.lastSyncAt?.toISOString() ?? null,
        lastSyncError: conn.lastSyncError,
        periodStart: conn.periodStart?.toISOString() ?? null,
        periodEnd: conn.periodEnd?.toISOString() ?? null,
      }
    : null;

  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <SearchPerformanceClient
        oauthConfigured={searchConsoleOAuthConfigured()}
        oauthCallbackUrl={getSearchConsoleRedirectUri()}
        connection={connectionPayload}
        queries={queries}
      />
    </Suspense>
  );
}
