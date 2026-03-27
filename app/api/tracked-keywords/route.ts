import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasAuditAccess } from "@/lib/plan-access";
import { trackedKeywordLimit } from "@/lib/tracked-keyword-limit";
import { normalizeTrackedPhrase, phraseKeyFromPhrase } from "@/lib/tracked-keywords-bootstrap";
import { matchGscRowForPhrase, type GscRowLite } from "@/lib/tracked-keywords-gsc-match";

async function requireKeywordClient() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { plan: true },
  });
  if (!sub || !hasAuditAccess(sub.plan)) {
    return { error: NextResponse.json({ error: "Plan does not include keyword tracking" }, { status: 403 }) };
  }
  return { userId: session.user.id, plan: sub.plan };
}

export async function GET() {
  const r = await requireKeywordClient();
  if ("error" in r) return r.error;

  const limit = trackedKeywordLimit(r.plan);

  const [keywords, gscRows] = await Promise.all([
    prisma.trackedKeyword.findMany({
      where: { userId: r.userId },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        phrase: true,
        note: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.gscQueryRow.findMany({
      where: { userId: r.userId },
      orderBy: [{ clicks: "desc" }, { impressions: "desc" }],
      take: 400,
      select: { query: true, clicks: true, impressions: true, ctr: true, position: true },
    }),
  ]);

  const gscLite: GscRowLite[] = gscRows.map((row) => ({
    query: row.query,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));

  const withGsc = keywords.map((k) => {
    const m = matchGscRowForPhrase(k.phrase, gscLite);
    return {
      ...k,
      createdAt: k.createdAt.toISOString(),
      updatedAt: k.updatedAt.toISOString(),
      gsc: m
        ? {
            matchedQuery: m.matchedQuery,
            clicks: m.clicks,
            impressions: m.impressions,
            ctr: m.ctr,
            position: m.position,
          }
        : null,
    };
  });

  return NextResponse.json({
    keywords: withGsc,
    limit,
    count: withGsc.length,
  });
}

export async function POST(req: Request) {
  const r = await requireKeywordClient();
  if ("error" in r) return r.error;

  const body = await req.json().catch(() => ({}));
  const phraseRaw = typeof body.phrase === "string" ? body.phrase : "";
  const phrase = normalizeTrackedPhrase(phraseRaw);
  if (phrase.length < 2) {
    return NextResponse.json({ error: "Phrase must be at least 2 characters" }, { status: 400 });
  }

  const limit = trackedKeywordLimit(r.plan);
  const current = await prisma.trackedKeyword.count({ where: { userId: r.userId } });
  if (current >= limit) {
    return NextResponse.json({ error: `Keyword limit reached (${limit} for your plan)` }, { status: 403 });
  }

  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) || null : null;
  const phraseKey = phraseKeyFromPhrase(phrase);

  try {
    const row = await prisma.trackedKeyword.create({
      data: {
        userId: r.userId,
        phrase,
        phraseKey,
        note,
        source: "MANUAL",
      },
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
    return NextResponse.json({ error: "Duplicate keyword" }, { status: 409 });
  }
}
