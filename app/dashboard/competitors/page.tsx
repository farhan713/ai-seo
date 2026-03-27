import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasAuditAccess, competitorWatchlistLimit } from "@/lib/plan-access";
import { CompetitorsClient } from "./competitors-client";

export default async function CompetitorsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!sub || !hasAuditAccess(sub.plan)) {
    redirect("/dashboard");
  }

  const limit = competitorWatchlistLimit(sub.plan);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Competitor watchlist</h1>
        <p className="mt-1 text-sm text-muted">
          Save competitor homepages and refresh to diff title, meta description, and H1 count. Your plan allows{" "}
          <strong>{limit}</strong> URL{limit === 1 ? "" : "s"}.
        </p>
      </div>
      <CompetitorsClient limit={limit} />
    </div>
  );
}
