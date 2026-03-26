import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultBacklinksForUser } from "@/lib/ensure-backlinks";
import type { Plan, SubscriptionStatus } from "@prisma/client";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "");
  const plan = body.plan as Plan | undefined;
  const status = body.status as SubscriptionStatus | undefined;
  const blogsPerWeek = Number(body.blogsPerWeek) || 3;
  const backlinksPerMonth = Number(body.backlinksPerMonth) || 10;
  const subscriptionId = body.subscriptionId ? String(body.subscriptionId) : null;

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  if (plan !== "SEO_CONTENT") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (!status || !["ACTIVE", "PAUSED", "CANCELLED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let sub;
  if (subscriptionId) {
    const existing = await prisma.subscription.findFirst({
      where: { id: subscriptionId, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }
    sub = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        plan,
        status,
        blogsPerWeek,
        backlinksPerMonth,
        startDate: body.startDate ? new Date(body.startDate) : existing.startDate,
        endDate: body.endDate ? new Date(body.endDate) : existing.endDate,
      },
    });
  } else {
    sub = await prisma.subscription.create({
      data: {
        userId,
        plan,
        status,
        blogsPerWeek,
        backlinksPerMonth,
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });
  }

  if (status === "ACTIVE") {
    await ensureDefaultBacklinksForUser(userId);
  }

  return NextResponse.json(sub);
}
