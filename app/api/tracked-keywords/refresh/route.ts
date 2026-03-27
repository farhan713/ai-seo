import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasAuditAccess } from "@/lib/plan-access";
import { ensureTrackedKeywordsSeeded } from "@/lib/tracked-keywords-bootstrap";

/** Re-run auto-seed from profile, audit pillars, and GSC (adds only missing rows up to plan limit). */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { plan: true },
  });
  if (!hasAuditAccess(sub?.plan)) {
    return NextResponse.json({ error: "Plan does not include keyword tracking" }, { status: 403 });
  }

  await ensureTrackedKeywordsSeeded(session.user.id);
  return NextResponse.json({ ok: true });
}
