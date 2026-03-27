import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasGa4Access } from "@/lib/plan-access";
import { ga4OAuthConfigured } from "@/lib/ga4-google";

export async function GET() {
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

  const row = await prisma.ga4Connection.findUnique({
    where: { userId: session.user.id },
    select: {
      propertyId: true,
      propertyDisplayName: true,
      lastSyncAt: true,
      lastSyncError: true,
      summaryJson: true,
    },
  });

  return NextResponse.json({ oauthConfigured: ga4OAuthConfigured(), connection: row });
}

export async function PATCH(req: Request) {
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

  const body = (await req.json().catch(() => ({}))) as {
    propertyId?: string | null;
    propertyDisplayName?: string | null;
  };

  const exists = await prisma.ga4Connection.findUnique({ where: { userId: session.user.id } });
  if (!exists) {
    return NextResponse.json({ error: "Connect Google first" }, { status: 400 });
  }

  const pid = typeof body.propertyId === "string" ? body.propertyId.replace(/\D/g, "").trim() : "";
  const display =
    typeof body.propertyDisplayName === "string" ? body.propertyDisplayName.trim().slice(0, 500) || null : null;

  if (body.propertyId !== undefined && !pid) {
    return NextResponse.json({ error: "Property ID must be numeric (from GA4 Admin)" }, { status: 400 });
  }

  const updated = await prisma.ga4Connection.update({
    where: { userId: session.user.id },
    data: {
      ...(pid ? { propertyId: pid } : {}),
      ...(body.propertyDisplayName !== undefined ? { propertyDisplayName: display } : {}),
    },
    select: {
      propertyId: true,
      propertyDisplayName: true,
      lastSyncAt: true,
      lastSyncError: true,
      summaryJson: true,
    },
  });

  return NextResponse.json({ connection: updated });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.ga4Connection.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
