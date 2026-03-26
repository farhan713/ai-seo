import { prisma } from "@/lib/prisma";

export default async function AdminHome() {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [totalUsers, activeSubs, blogsToday] = await Promise.all([
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.subscription.count({ where: { status: "ACTIVE", plan: "SEO_CONTENT" } }),
    prisma.blog.count({ where: { generatedAt: { gte: startOfDay } } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Admin overview</h1>
        <p className="mt-1 text-sm text-muted">Platform health at a glance.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm">
          <div className="text-sm font-medium text-muted">Client users</div>
          <div className="mt-2 text-3xl font-semibold text-primary">{totalUsers}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm">
          <div className="text-sm font-medium text-muted">Active subscriptions</div>
          <div className="mt-2 text-3xl font-semibold text-primary">{activeSubs}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm">
          <div className="text-sm font-medium text-muted">Blogs generated today</div>
          <div className="mt-2 text-3xl font-semibold text-primary">{blogsToday}</div>
        </div>
      </div>
    </div>
  );
}
