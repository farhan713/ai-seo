import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasGa4Access } from "@/lib/plan-access";
import { syncGa4ForUser } from "@/lib/ga4-sync";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!sub || !hasGa4Access(sub.plan)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await syncGa4ForUser(session.user.id);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const row = await prisma.ga4Connection.findUnique({
    where: { userId: session.user.id },
    select: { summaryJson: true, lastSyncAt: true, lastSyncError: true },
  });

  return NextResponse.json({ connection: row });
}
