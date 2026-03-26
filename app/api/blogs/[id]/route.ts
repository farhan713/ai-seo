import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { BlogStatus } from "@prisma/client";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const blog = await prisma.blog.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!blog) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(blog);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const status = body.status as BlogStatus | undefined;
  if (status !== "COPIED" && status !== "PUBLISHED" && status !== "GENERATED") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.blog.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: { status: BlogStatus; copiedAt?: Date | null } = { status };
  if (status === "COPIED" || status === "PUBLISHED") {
    data.copiedAt = existing.copiedAt ?? new Date();
  }

  const blog = await prisma.blog.update({
    where: { id },
    data,
  });
  return NextResponse.json(blog);
}
