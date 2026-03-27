import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureDefaultBacklinksForUser,
  maybeRollForwardBacklinkBatch,
} from "@/lib/ensure-backlinks";
import { hasGrowthFeatures } from "@/lib/plan-access";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  await maybeRollForwardBacklinkBatch(userId);
  await ensureDefaultBacklinksForUser(userId);

  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!sub || !hasGrowthFeatures(sub.plan)) {
    return NextResponse.json([]);
  }

  const backlinks = await prisma.backlink.findMany({
    where: { userId, batch: sub.backlinkBatch },
    orderBy: [{ priority: "asc" }, { directoryName: "asc" }],
  });

  return NextResponse.json(backlinks);
}
