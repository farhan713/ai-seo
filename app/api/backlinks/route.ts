import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultBacklinksForUser } from "@/lib/ensure-backlinks";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDefaultBacklinksForUser(session.user.id);

  const backlinks = await prisma.backlink.findMany({
    where: { userId: session.user.id },
    orderBy: [{ priority: "asc" }, { directoryName: "asc" }],
  });

  return NextResponse.json(backlinks);
}
