import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasAuditAccess } from "@/lib/plan-access";
import { normalizeWebsiteUrl } from "@/lib/url-normalize";
import { runCrawlForStoredRun } from "@/lib/site-crawler";

/** Multi-page crawl can exceed default serverless limits on Vercel; increase on host if needed. */
export const maxDuration = 300;

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

  const runs = await prisma.crawlRun.findMany({
    where: { userId: session.user.id },
    orderBy: { startedAt: "desc" },
    take: 25,
    include: { _count: { select: { pages: true } } },
  });

  return NextResponse.json(
    runs.map((r) => ({
      id: r.id,
      baseUrl: r.baseUrl,
      status: r.status,
      maxPages: r.maxPages,
      pagesCrawled: r.pagesCrawled,
      stats: r.stats,
      errorMessage: r.errorMessage,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      pageRows: r._count.pages,
    }))
  );
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

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.businessUrl) {
    return NextResponse.json({ error: "Set your website URL on your profile" }, { status: 400 });
  }

  let maxPages = 40;
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const b = (await req.json()) as { maxPages?: number };
      if (typeof b.maxPages === "number" && Number.isFinite(b.maxPages)) {
        maxPages = Math.min(80, Math.max(5, Math.round(b.maxPages)));
      }
    }
  } catch {
    /* default */
  }

  const baseUrl = normalizeWebsiteUrl(user.businessUrl);

  const run = await prisma.crawlRun.create({
    data: {
      userId: user.id,
      baseUrl,
      maxPages,
      status: "RUNNING",
    },
  });

  await runCrawlForStoredRun(run.id);

  const done = await prisma.crawlRun.findUnique({
    where: { id: run.id },
    select: {
      id: true,
      baseUrl: true,
      status: true,
      maxPages: true,
      pagesCrawled: true,
      stats: true,
      errorMessage: true,
      startedAt: true,
      completedAt: true,
    },
  });

  return NextResponse.json(done);
}
