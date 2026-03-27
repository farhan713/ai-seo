import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasAuditAccess, competitorWatchlistLimit } from "@/lib/plan-access";
import { normalizeWebsiteUrl } from "@/lib/url-normalize";
import { competitorStorageKey } from "@/lib/competitors";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!sub || !hasAuditAccess(sub.plan)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.competitorWatch.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    competitors: rows,
    limit: competitorWatchlistLimit(sub.plan),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!sub || !hasAuditAccess(sub.plan)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limit = competitorWatchlistLimit(sub.plan);
  if (limit <= 0) {
    return NextResponse.json({ error: "Plan does not include competitor watch" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { url?: string; label?: string };
  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
  if (!rawUrl) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  let normalized: string;
  try {
    normalized = normalizeWebsiteUrl(rawUrl);
    new URL(normalized);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { businessUrl: true },
  });
  const mine = user?.businessUrl?.trim() ? normalizeWebsiteUrl(user.businessUrl.trim()) : "";
  if (mine && normalized.replace(/\/$/, "") === mine.replace(/\/$/, "")) {
    return NextResponse.json({ error: "Use a competitor URL, not your own site" }, { status: 400 });
  }

  const count = await prisma.competitorWatch.count({ where: { userId: session.user.id } });
  if (count >= limit) {
    return NextResponse.json({ error: `Maximum ${limit} competitor URLs on your plan` }, { status: 400 });
  }

  const urlKey = competitorStorageKey(normalized);
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 200) || null : null;

  try {
    const row = await prisma.competitorWatch.create({
      data: {
        userId: session.user.id,
        url: normalized,
        urlKey,
        label,
      },
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "That competitor URL is already saved" }, { status: 400 });
  }
}
