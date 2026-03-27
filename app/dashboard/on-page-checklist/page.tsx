import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasAuditAccess } from "@/lib/plan-access";
import OnPageChecklistClient from "./on-page-checklist-client";

export const dynamic = "force-dynamic";

export default async function OnPageChecklistPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!sub || !hasAuditAccess(sub.plan)) {
    return (
      <div className="rounded-xl border border-slate-200 bg-card p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">On-page checklist</h1>
        <p className="mt-2 text-sm text-muted">An active plan is required.</p>
      </div>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { businessUrl: true },
  });

  const latest = await prisma.siteAudit.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { url: true },
  });

  const defaultUrl = user?.businessUrl?.trim() || latest?.url || "";

  return <OnPageChecklistClient defaultUrl={defaultUrl} />;
}
