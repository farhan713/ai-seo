import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/admin");

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE", plan: "SEO_CONTENT" },
    orderBy: { createdAt: "desc" },
  });

  const planBadge = sub ? `SEO Content · ${sub.blogsPerWeek}/wk` : "No active plan";

  return (
    <DashboardShell
      userName={session.user.name || "Client"}
      userEmail={session.user.email || ""}
      planBadge={planBadge}
    >
      {children}
    </DashboardShell>
  );
}
