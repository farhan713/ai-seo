import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasSocialAutomation } from "@/lib/plan-access";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!sub || !hasSocialAutomation(sub.plan)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ads = await prisma.socialAd.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json(ads);
}
