import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  hasAuditAccess,
  hasGrowthFeatures,
  hasShareableReport,
  hasSocialAutomation,
  hasTrendCampaignIdeas,
  planLabel,
} from "@/lib/plan-access";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/admin");

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  const planBadge = sub ? planLabel(sub.plan) : "No active plan";

  const navItems: { href: string; label: string }[] = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/settings", label: "Business profile" },
  ];
  if (sub && hasAuditAccess(sub.plan)) {
    navItems.push({ href: "/dashboard/audit", label: "Site audit" });
    navItems.push({ href: "/dashboard/site-crawl", label: "Site crawl" });
    navItems.push({ href: "/dashboard/search-performance", label: "Search performance" });
    navItems.push({ href: "/dashboard/keywords", label: "Keywords" });
    navItems.push({ href: "/dashboard/calendar", label: "Content calendar" });
    navItems.push({ href: "/dashboard/on-page-checklist", label: "On-page checklist" });
    navItems.push({ href: "/dashboard/competitors", label: "Competitors" });
  }
  if (sub && hasGrowthFeatures(sub.plan)) {
    navItems.push({ href: "/dashboard/blogs", label: "Blogs" });
    navItems.push({ href: "/dashboard/backlinks", label: "Backlinks" });
    navItems.push({ href: "/dashboard/analytics", label: "Web analytics" });
  }
  if (sub && hasTrendCampaignIdeas(sub.plan)) {
    navItems.push({ href: "/dashboard/campaign-ideas", label: "Campaign ideas" });
  }
  if (sub && hasShareableReport(sub.plan)) {
    navItems.push({ href: "/dashboard/share-report", label: "Share report" });
  }
  if (sub && hasSocialAutomation(sub.plan)) {
    navItems.push({ href: "/dashboard/social", label: "Social ads" });
  }

  return (
    <DashboardShell
      userName={session.user.name || "Client"}
      userEmail={session.user.email || ""}
      planBadge={planBadge}
      navItems={navItems}
    >
      {children}
    </DashboardShell>
  );
}
