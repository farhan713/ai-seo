import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasCampaignIdeaSocialDraft, hasTrendCampaignIdeas } from "@/lib/plan-access";
import { CampaignIdeasClient } from "./campaign-ideas-client";

export default async function CampaignIdeasPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!sub || !hasTrendCampaignIdeas(sub.plan)) {
    redirect("/dashboard");
  }

  const canCreateDraft = hasCampaignIdeaSocialDraft(sub.plan);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Campaign ideas</h1>
        <p className="mt-1 text-sm text-muted">
          Trend-aware hooks for posts and reels (Growth and Elite). Elite can turn any idea into a ready-to-use draft on
          Social ads.
        </p>
      </div>
      <CampaignIdeasClient canCreateDraft={canCreateDraft} />
    </div>
  );
}
