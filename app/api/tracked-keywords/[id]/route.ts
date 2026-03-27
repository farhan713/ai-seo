import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasAuditAccess } from "@/lib/plan-access";
import { normalizeTrackedPhrase, phraseKeyFromPhrase } from "@/lib/tracked-keywords-bootstrap";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.trackedKeyword.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const data: { phrase?: string; phraseKey?: string; note?: string | null; source?: "MANUAL" } = {};

  if (typeof body.phrase === "string") {
    const phrase = normalizeTrackedPhrase(body.phrase);
    if (phrase.length < 2) {
      return NextResponse.json({ error: "Phrase must be at least 2 characters" }, { status: 400 });
    }
    data.phrase = phrase;
    data.phraseKey = phraseKeyFromPhrase(phrase);
  }
  if (body.note !== undefined) {
    data.note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) || null : null;
  }
  /** Editing implies user ownership of the phrase going forward. */
  if (data.phrase != null || body.promoteToManual === true) {
    data.source = "MANUAL";
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  try {
    const row = await prisma.trackedKeyword.update({
      where: { id },
      data,
      select: {
        id: true,
        phrase: true,
        note: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Duplicate keyword or update failed" }, { status: 409 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.trackedKeyword.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.trackedKeyword.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
