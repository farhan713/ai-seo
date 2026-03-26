import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const data: Prisma.UserUpdateInput = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.businessName === "string" || body.businessName === null) {
    data.businessName = body.businessName === null ? null : body.businessName.trim();
  }
  if (typeof body.businessUrl === "string" || body.businessUrl === null) {
    data.businessUrl = body.businessUrl === null ? null : body.businessUrl.trim();
  }
  if (typeof body.businessDescription === "string" || body.businessDescription === null) {
    data.businessDescription =
      body.businessDescription === null ? null : body.businessDescription.trim();
  }
  if (typeof body.industry === "string" || body.industry === null) {
    data.industry = body.industry === null ? null : body.industry.trim();
  }
  if (typeof body.targetKeywords === "string" || body.targetKeywords === null) {
    data.targetKeywords = body.targetKeywords === null ? null : body.targetKeywords.trim();
  }
  if (body.internalLinks !== undefined) {
    data.internalLinks = body.internalLinks as Prisma.InputJsonValue;
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      businessName: true,
      businessUrl: true,
      businessDescription: true,
      industry: true,
      targetKeywords: true,
      internalLinks: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user);
}
