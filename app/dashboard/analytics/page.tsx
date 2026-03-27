import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasGa4Access } from "@/lib/plan-access";
import { ga4OAuthConfigured } from "@/lib/ga4-google";
import { AnalyticsClient } from "./analytics-client";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Web analytics (GA4)</h1>
        <p className="mt-1 text-sm text-muted">Connect read-only GA4 to see sessions and top pages next to your SEO work.</p>
      </div>
      <AnalyticsClient allowed={!!sub && hasGa4Access(sub.plan)} oauthConfigured={ga4OAuthConfigured()} />
    </div>
  );
}
