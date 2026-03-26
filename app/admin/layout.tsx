import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <AdminShell userName={session.user.name || "Admin"} userEmail={session.user.email || ""}>
      {children}
    </AdminShell>
  );
}
