import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function BlogsListPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const blogs = await prisma.blog.findMany({
    where: { userId: session.user.id },
    orderBy: { generatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Blogs</h1>
        <p className="mt-1 text-sm text-muted">Generated posts for your business.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-600">Title</th>
              <th className="hidden px-4 py-3 font-medium text-slate-600 sm:table-cell">Generated</th>
              <th className="px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 font-medium text-slate-600" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {blogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted">
                  No blogs yet. Your admin will assign a plan and content will appear here.
                </td>
              </tr>
            ) : (
              blogs.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/blogs/${b.id}`} className="font-medium text-primary hover:underline">
                      {b.title}
                    </Link>
                    <div className="text-xs text-muted sm:hidden">{b.generatedAt.toLocaleDateString()}</div>
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    {b.generatedAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/blogs/${b.id}`}
                      className="text-sm font-medium text-accent hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
