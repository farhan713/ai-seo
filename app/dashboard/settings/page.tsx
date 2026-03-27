import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasMonthlyExecutiveReport } from "@/lib/plan-access";
import { parseClientProvidedKeys } from "@/lib/client-keys";
import { BusinessSettingsForm } from "./business-settings-form";

export default async function DashboardSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/admin");

  const [user, sub] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        businessName: true,
        businessUrl: true,
        businessDescription: true,
        industry: true,
        industryVertical: true,
        marketingGoal: true,
        targetKeywords: true,
        internalLinks: true,
        monthlyExecutiveReportOptIn: true,
        localSeoPackEnabled: true,
        clientProvidedKeys: true,
      },
    }),
    prisma.subscription.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!user) redirect("/login");

  const { clientProvidedKeys: rawKeys, ...userFields } = user;
  const keys = parseClientProvidedKeys(rawKeys);

  return (
    <div className="w-full max-w-[720px]">
      <BusinessSettingsForm
        initial={{
          ...userFields,
          hasGeminiKey: !!keys.geminiApiKey,
          hasPageSpeedKey: !!keys.pageSpeedApiKey,
        }}
        canMonthlyReport={sub ? hasMonthlyExecutiveReport(sub.plan) : false}
      />
    </div>
  );
}
