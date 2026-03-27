import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultBacklinksForUser } from "@/lib/ensure-backlinks";
import { defaultsForPlan } from "@/lib/subscription-defaults";
import { hasGrowthFeatures } from "@/lib/plan-access";
import { ensureTrackedKeywordsSeeded } from "@/lib/tracked-keywords-bootstrap";
import type { Plan, SubscriptionStatus } from "@prisma/client";

const PLANS: Plan[] = ["STARTER_499", "GROWTH_899", "ELITE_1599"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "");
  const plan = body.plan as Plan | undefined;
  const status = body.status as SubscriptionStatus | undefined;
  const subscriptionId = body.subscriptionId ? String(body.subscriptionId) : null;

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  if (!plan || !PLANS.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (!status || !["ACTIVE", "PAUSED", "CANCELLED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const defs = defaultsForPlan(plan);
  const blogsPerWeek =
    body.blogsPerWeek !== undefined && body.blogsPerWeek !== ""
      ? Number(body.blogsPerWeek)
      : defs.blogsPerWeek;
  const backlinksPerMonth =
    body.backlinksPerMonth !== undefined && body.backlinksPerMonth !== ""
      ? Number(body.backlinksPerMonth)
      : defs.backlinksPerMonth;
  const priceInInr =
    body.priceInInr !== undefined && body.priceInInr !== ""
      ? Number(body.priceInInr)
      : defs.priceInInr;

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
        priceInInr,
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
        priceInInr,
        blogsPerWeek,
        backlinksPerMonth,
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });
  }

  if (status === "ACTIVE" && hasGrowthFeatures(plan)) {
    await ensureDefaultBacklinksForUser(userId);
  }

  if (status === "ACTIVE") {
    await ensureTrackedKeywordsSeeded(userId).catch(() => {});
  }

  return NextResponse.json(sub);
}
