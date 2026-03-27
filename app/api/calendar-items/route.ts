import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { contentCalendarItemLimit, hasAuditAccess } from "@/lib/plan-access";
import { seedCalendarFromAuditPillars } from "@/lib/calendar-seed";

async function clientPlan(userId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { plan: true },
  });
  if (!sub || !hasAuditAccess(sub.plan)) return null;
  return sub.plan;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const plan = await clientPlan(session.user.id);
  if (!plan) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await prisma.contentCalendarItem.findMany({
    where: { userId: session.user.id },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    items: items.map((i) => ({
      ...i,
      dueDate: i.dueDate?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    })),
    limit: contentCalendarItemLimit(plan),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const plan = await clientPlan(session.user.id);
  if (!plan) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const limit = contentCalendarItemLimit(plan);
  const body = await req.json().catch(() => ({}));

  if (typeof body.seedFromAuditId === "string" && body.seedFromAuditId) {
    const count = await prisma.contentCalendarItem.count({ where: { userId: session.user.id } });
    const room = Math.max(0, limit - count);
    if (room <= 0) {
      return NextResponse.json({ error: "Calendar item limit reached" }, { status: 403 });
    }
    const { added } = await seedCalendarFromAuditPillars({
      userId: session.user.id,
      auditId: body.seedFromAuditId,
      maxToAdd: room,
    });
    return NextResponse.json({ ok: true, added });
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 500) : "";
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const current = await prisma.contentCalendarItem.count({ where: { userId: session.user.id } });
  if (current >= limit) {
    return NextResponse.json({ error: `Calendar limit is ${limit} items on your plan` }, { status: 403 });
  }

  const brief = typeof body.brief === "string" ? body.brief.trim().slice(0, 4000) : "";
  let dueDate: Date | null = null;
  if (typeof body.dueDate === "string" && body.dueDate) {
    const d = new Date(body.dueDate);
    if (!Number.isNaN(d.getTime())) dueDate = d;
  }

  const status =
    body.status === "IN_PROGRESS" || body.status === "DONE" || body.status === "SKIPPED" ? body.status : "PLANNED";

  const row = await prisma.contentCalendarItem.create({
    data: {
      userId: session.user.id,
      title,
      brief,
      dueDate,
      status,
      sourceAuditId: typeof body.sourceAuditId === "string" ? body.sourceAuditId : null,
    },
  });

  return NextResponse.json({
    ...row,
    dueDate: row.dueDate?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}
