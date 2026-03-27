import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { hasSocialAutomation } from "@/lib/plan-access";

/** Store Meta long-lived tokens (use encryption + Meta app in production). */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!sub || !hasSocialAutomation(sub.plan)) {
    return NextResponse.json(
      { error: "Elite plan required for social automation" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const socialCredentials = body.socialCredentials as Prisma.InputJsonValue | undefined;
  if (socialCredentials === undefined) {
    return NextResponse.json({ error: "socialCredentials object required" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { socialCredentials },
  });

  return NextResponse.json({ ok: true });
}
