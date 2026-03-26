import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { createdAt: "desc" },
    include: {
      subscriptions: { where: { status: "ACTIVE" }, take: 1 },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Users</h1>
        <p className="mt-1 text-sm text-muted">Clients and their account status.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 font-medium text-slate-600">Email</th>
              <th className="hidden px-4 py-3 font-medium text-slate-600 md:table-cell">Business</th>
              <th className="px-4 py-3 font-medium text-slate-600">Active</th>
              <th className="px-4 py-3 font-medium text-slate-600">Plan</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                <td className="px-4 py-3 text-muted">{u.email}</td>
                <td className="hidden px-4 py-3 text-muted md:table-cell">{u.businessName || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {u.isActive ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {u.subscriptions[0]?.plan ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
