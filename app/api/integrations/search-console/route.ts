import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { searchConsoleOAuthConfigured } from "@/lib/search-console-google";
import { syncSearchConsoleForUser } from "@/lib/search-console-sync";
import { hasAuditAccess } from "@/lib/plan-access";

type SearchConsoleAuthResult = { userId: string } | { error: NextResponse };

async function requireSearchConsoleClient(): Promise<SearchConsoleAuthResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { plan: true },
  });
  if (!hasAuditAccess(sub?.plan)) {
    return { error: NextResponse.json({ error: "Plan does not include search insights" }, { status: 403 }) };
  }
  return { userId: session.user.id };
}

export async function GET() {
  const r = await requireSearchConsoleClient();
  if ("error" in r) return r.error;

  const conn = await prisma.searchConsoleConnection.findUnique({
    where: { userId: r.userId },
    select: {
      siteUrl: true,
      lastSyncAt: true,
      lastSyncError: true,
      periodStart: true,
      periodEnd: true,
      createdAt: true,
    },
  });

  const queries = conn
    ? await prisma.gscQueryRow.findMany({
        where: { userId: r.userId },
        orderBy: [{ clicks: "desc" }, { impressions: "desc" }],
        take: 100,
        select: {
          query: true,
          clicks: true,
          impressions: true,
          ctr: true,
          position: true,
          periodStart: true,
          periodEnd: true,
        },
      })
    : [];

  return NextResponse.json({
    oauthConfigured: searchConsoleOAuthConfigured(),
    connection: conn,
    queries,
  });
}

export async function POST() {
  const r = await requireSearchConsoleClient();
  if ("error" in r) return r.error;

  const result = await syncSearchConsoleForUser(r.userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Sync failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, rowCount: result.rowCount ?? 0 });
}

export async function DELETE() {
  const r = await requireSearchConsoleClient();
  if ("error" in r) return r.error;

  await prisma.gscQueryRow.deleteMany({ where: { userId: r.userId } });
  await prisma.searchConsoleConnection.deleteMany({ where: { userId: r.userId } });
  return NextResponse.json({ ok: true });
}
