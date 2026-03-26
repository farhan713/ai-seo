import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { BacklinkStatus } from "@prisma/client";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const status = body.status as BacklinkStatus | undefined;
  if (status !== "PENDING" && status !== "SUBMITTED" && status !== "VERIFIED") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.backlink.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: {
    status: BacklinkStatus;
    submittedAt?: Date | null;
    verifiedAt?: Date | null;
  } = { status };

  if (status === "SUBMITTED") {
    data.submittedAt = existing.submittedAt ?? new Date();
    data.verifiedAt = null;
  } else if (status === "VERIFIED") {
    data.verifiedAt = existing.verifiedAt ?? new Date();
    if (!existing.submittedAt) data.submittedAt = new Date();
  } else {
    data.submittedAt = null;
    data.verifiedAt = null;
  }

  const backlink = await prisma.backlink.update({ where: { id }, data });
  return NextResponse.json(backlink);
}
