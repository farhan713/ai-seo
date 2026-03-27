import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasShareableReport } from "@/lib/plan-access";
import { ShareReportClient } from "./share-report-client";

export default async function ShareReportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!sub || !hasShareableReport(sub.plan)) {
    redirect("/dashboard");
  }

  const baseUrl = (process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Share client report</h1>
        <p className="mt-1 text-sm text-muted">Create expiring public links for stakeholders without giving them a password.</p>
      </div>
      <ShareReportClient baseUrl={baseUrl} />
    </div>
  );
}
