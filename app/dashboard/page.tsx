import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { countBlogsThisWeek } from "@/lib/blog-service";
import Link from "next/link";

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getUTCDay();
  const diff = (day + 6) % 7;
  x.setUTCDate(x.getUTCDate() - diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export default async function DashboardHome() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const weekStart = startOfWeek(new Date());

  const [blogsThisWeek, recentBlogs, backlinkStats, recentBacklinks] = await Promise.all([
    countBlogsThisWeek(userId),
    prisma.blog.findMany({
      where: { userId },
      orderBy: { generatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true, generatedAt: true },
    }),
    prisma.backlink.groupBy({
      by: ["status"],
      where: { userId },
      _count: true,
    }),
    prisma.backlink.findMany({
      where: { userId, status: { not: "PENDING" } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { directoryName: true, status: true, updatedAt: true },
    }),
  ]);

  const submitted = backlinkStats.find((s) => s.status === "SUBMITTED")?._count ?? 0;
  const verified = backlinkStats.find((s) => s.status === "VERIFIED")?._count ?? 0;
  const done = submitted + verified;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Overview</h1>
        <p className="mt-1 text-sm text-muted">Your content and backlinks at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm">
          <div className="text-sm font-medium text-muted">Blogs this week</div>
          <div className="mt-2 text-3xl font-semibold text-primary">{blogsThisWeek}</div>
          <p className="mt-1 text-xs text-muted">Resets each Monday (UTC)</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm">
          <div className="text-sm font-medium text-muted">Backlinks progress</div>
          <div className="mt-2 text-3xl font-semibold text-primary">{done}</div>
          <p className="mt-1 text-xs text-muted">Submitted or verified listings</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="text-sm font-medium text-muted">Week window</div>
          <div className="mt-2 text-sm text-slate-700">
            Started {weekStart.toLocaleDateString(undefined, { dateStyle: "medium" })}
          </div>
          <Link
            href="/dashboard/blogs"
            className="mt-3 inline-flex text-sm font-medium text-accent hover:underline"
          >
            View all blogs →
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-card shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Recent blogs</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {recentBlogs.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-muted">No blogs yet.</li>
            ) : (
              recentBlogs.map((b) => (
                <li key={b.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <Link href={`/dashboard/blogs/${b.id}`} className="font-medium text-slate-800 hover:text-primary">
                      {b.title}
                    </Link>
                    <div className="text-xs text-muted">
                      {b.generatedAt.toLocaleDateString()} · {b.status}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-card shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Backlink activity</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {recentBacklinks.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-muted">No submissions yet.</li>
            ) : (
              recentBacklinks.map((b, i) => (
                <li key={i} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-slate-800">{b.directoryName}</span>
                  <span className="text-xs font-medium text-accent">{b.status}</span>
                </li>
              ))
            )}
          </ul>
          <div className="border-t border-slate-100 px-5 py-3">
            <Link href="/dashboard/backlinks" className="text-sm font-medium text-accent hover:underline">
              Manage backlinks →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
