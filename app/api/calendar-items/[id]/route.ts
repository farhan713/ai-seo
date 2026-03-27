import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasAuditAccess } from "@/lib/plan-access";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { plan: true },
  });
  if (!sub || !hasAuditAccess(sub.plan)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const existing = await prisma.contentCalendarItem.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: {
    title?: string;
    brief?: string;
    dueDate?: Date | null;
    status?: "PLANNED" | "IN_PROGRESS" | "DONE" | "SKIPPED";
  } = {};

  if (typeof body.title === "string") data.title = body.title.trim().slice(0, 500);
  if (typeof body.brief === "string") data.brief = body.brief.trim().slice(0, 4000);
  if (body.dueDate === null) data.dueDate = null;
  if (typeof body.dueDate === "string" && body.dueDate) {
    const d = new Date(body.dueDate);
    if (!Number.isNaN(d.getTime())) data.dueDate = d;
  }
  if (body.status === "PLANNED" || body.status === "IN_PROGRESS" || body.status === "DONE" || body.status === "SKIPPED") {
    data.status = body.status;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const row = await prisma.contentCalendarItem.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    ...row,
    dueDate: row.dueDate?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { plan: true },
  });
  if (!sub || !hasAuditAccess(sub.plan)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const existing = await prisma.contentCalendarItem.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.contentCalendarItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
