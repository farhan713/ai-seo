import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasAuditAccess } from "@/lib/plan-access";
import CalendarClient from "./calendar-client";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!sub || !hasAuditAccess(sub.plan)) {
    return (
      <div className="rounded-xl border border-slate-200 bg-card p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Content calendar</h1>
        <p className="mt-2 text-sm text-muted">An active plan is required.</p>
      </div>
    );
  }

  const audits = await prisma.siteAudit.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, url: true, createdAt: true },
  });

  return <CalendarClient audits={audits.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))} />;
}
