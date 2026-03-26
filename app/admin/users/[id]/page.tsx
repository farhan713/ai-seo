import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { UserEditForm } from "./user-edit-form";
import { BlogBodyPreview } from "@/components/blog-body-preview";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findFirst({
    where: { id, role: "CLIENT" },
    include: {
      subscriptions: { orderBy: { createdAt: "desc" } },
      blogs: { orderBy: { generatedAt: "desc" }, take: 10 },
      backlinks: { orderBy: { directoryName: "asc" }, take: 20 },
    },
  });
  if (!user) notFound();

  return (
    <div className="space-y-8">
      <Link href="/admin/users" className="text-sm font-medium text-accent hover:underline">
        ← All users
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{user.name}</h1>
        <p className="mt-1 text-sm text-muted">{user.email}</p>
      </div>

      <UserEditForm
        user={{
          id: user.id,
          name: user.name,
          businessName: user.businessName,
          businessUrl: user.businessUrl,
          businessDescription: user.businessDescription,
          industry: user.industry,
          targetKeywords: user.targetKeywords,
          internalLinks: user.internalLinks,
          isActive: user.isActive,
        }}
      />

      <div className="rounded-xl border border-slate-200 bg-card p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Subscriptions</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {user.subscriptions.length === 0 ? (
            <li className="text-muted">No subscriptions.</li>
          ) : (
            user.subscriptions.map((s) => (
              <li key={s.id} className="flex flex-wrap gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <span className="font-medium">{s.plan}</span>
                <span className="text-muted">{s.status}</span>
                <span className="text-muted">{s.blogsPerWeek}/wk blogs</span>
                <span className="text-muted">{s.backlinksPerMonth}/mo backlinks</span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-card shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Recent blogs</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {user.blogs.length === 0 ? (
            <li className="px-6 py-6 text-sm text-muted">No blogs.</li>
          ) : (
            user.blogs.map((b) => (
              <li key={b.id} className="px-6 py-4">
                <div className="font-medium text-slate-800">{b.title}</div>
                <div className="text-xs text-muted">
                  {b.generatedAt.toLocaleString()} · {b.status}
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-accent">Preview</summary>
                  <div className="mt-2 rounded border border-slate-100 p-3">
                    <BlogBodyPreview body={b.body} />
                  </div>
                </details>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-card shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Backlinks</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {user.backlinks.length === 0 ? (
            <li className="px-6 py-6 text-sm text-muted">No backlink rows (activate a subscription to seed).</li>
          ) : (
            user.backlinks.map((l) => (
              <li key={l.id} className="flex items-center justify-between px-6 py-2 text-sm">
                <span>{l.directoryName}</span>
                <span className="text-xs text-muted">{l.status}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
