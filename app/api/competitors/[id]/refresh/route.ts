import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasAuditAccess } from "@/lib/plan-access";
import { fetchPageSignalsForAudit } from "@/lib/page-fetch-audit";
import { snapshotFromPageSignals, type CompetitorSnapshotStored } from "@/lib/competitors";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

function parseSnapshot(raw: unknown): CompetitorSnapshotStored | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.fetchedAt !== "string") return null;
  return raw as CompetitorSnapshotStored;
}

export async function POST(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!sub || !hasAuditAccess(sub.plan)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const row = await prisma.competitorWatch.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const signals = await fetchPageSignalsForAudit(row.url);
  const nextSnap = snapshotFromPageSignals(signals);
  const prior = parseSnapshot(row.snapshot);

  const updated = await prisma.competitorWatch.update({
    where: { id: row.id },
    data: {
      priorSnapshot: prior ? (prior as object) : undefined,
      snapshot: nextSnap as object,
    },
  });

  return NextResponse.json(updated);
}
