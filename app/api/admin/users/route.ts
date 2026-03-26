import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      businessName: true,
      isActive: true,
      createdAt: true,
      subscriptions: {
        where: { status: "ACTIVE" },
        take: 1,
        select: { plan: true, status: true, blogsPerWeek: true },
      },
    },
  });

  return NextResponse.json(users);
}
