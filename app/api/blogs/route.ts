import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blogs = await prisma.blog.findMany({
    where: { userId: session.user.id },
    orderBy: { generatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      status: true,
      generatedAt: true,
      copiedAt: true,
    },
  });

  return NextResponse.json(blogs);
}
