import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasShareableReport } from "@/lib/plan-access";
import { buildReportShareSnapshot } from "@/lib/report-share-snapshot";

const MAX_DAYS = 90;
const DEFAULT_DAYS = 14;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!sub || !hasShareableReport(sub.plan)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.reportShare.findMany({
    where: { userId: session.user.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, token: true, expiresAt: true, createdAt: true },
  });

  return NextResponse.json({ shares: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!sub || !hasShareableReport(sub.plan)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { expiresInDays?: number };
  let days = typeof body.expiresInDays === "number" ? Math.floor(body.expiresInDays) : DEFAULT_DAYS;
  if (days < 1) days = DEFAULT_DAYS;
  if (days > MAX_DAYS) days = MAX_DAYS;

  const snapshot = await buildReportShareSnapshot(session.user.id);
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const row = await prisma.reportShare.create({
    data: {
      userId: session.user.id,
      token,
      expiresAt,
      snapshotJson: snapshot as object,
    },
  });

  const base = (process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const publicUrl = base ? `${base}/r/${token}` : `/r/${token}`;

  return NextResponse.json({
    id: row.id,
    token: row.token,
    expiresAt: row.expiresAt.toISOString(),
    publicUrl,
  });
}
