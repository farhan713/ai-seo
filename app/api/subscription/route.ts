import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { planLabel } from "@/lib/plan-access";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!sub) return NextResponse.json(null);

  return NextResponse.json({
    plan: sub.plan,
    planLabel: planLabel(sub.plan),
    priceInInr: sub.priceInInr,
    blogsPerWeek: sub.blogsPerWeek,
    backlinksPerMonth: sub.backlinksPerMonth,
    backlinkBatch: sub.backlinkBatch,
    backlinkBatchDone: sub.backlinkBatchDone,
    nextBacklinkBatchAt: sub.nextBacklinkBatchAt,
  });
}
