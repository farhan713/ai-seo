import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasTrendCampaignIdeas } from "@/lib/plan-access";
import { parseClientProvidedKeys } from "@/lib/client-keys";
import { httpStatusForGeminiError, userFacingMessageFromGeminiError } from "@/lib/gemini-http";
import { generateTrendCampaignIdeas, type TrendCampaignIdea } from "@/lib/gemini-campaign-ideas";

const MAX_FOCUS = 2000;

function focusCacheKey(optionalFocus: string | null): string {
  const raw = optionalFocus?.trim() ?? "";
  return createHash("sha256").update(raw, "utf8").digest("hex");
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
  if (!sub || !hasTrendCampaignIdeas(sub.plan)) {
    return NextResponse.json({ error: "Upgrade to Growth or Elite for campaign ideas." }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      businessName: true,
      businessUrl: true,
      businessDescription: true,
      industry: true,
      industryVertical: true,
      marketingGoal: true,
      clientProvidedKeys: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const keys = parseClientProvidedKeys(user.clientProvidedKeys);
  const now = new Date();
  const calendarDateLabel = now.toISOString().slice(0, 10);
  const weekdayName = now.toLocaleDateString("en-IN", { weekday: "long", timeZone: "Asia/Kolkata" });

  const body = (await req.json().catch(() => ({}))) as { focus?: unknown; forceRefresh?: unknown };
  let optionalFocus: string | null = null;
  if (typeof body.focus === "string") {
    const t = body.focus.trim().slice(0, MAX_FOCUS);
    optionalFocus = t.length > 0 ? t : null;
  }
  const forceRefresh = body.forceRefresh === true;

  const dayKey = calendarDateLabel;
  const focusKey = focusCacheKey(optionalFocus);

  if (!forceRefresh) {
    const cached = await prisma.campaignIdeaDailyCache.findUnique({
      where: {
        userId_dayKey_focusKey: { userId: session.user.id, dayKey, focusKey },
      },
    });
    if (cached) {
      const ideas = cached.ideasJson as unknown;
      if (Array.isArray(ideas) && ideas.length > 0) {
        return NextResponse.json({
          generatedAt: cached.sourceGeneratedAt.toISOString(),
          calendarDateLabel: dayKey,
          weekdayName: cached.weekdayName,
          ideas,
          focusApplied: !!optionalFocus,
          fromCache: true,
        });
      }
    }
  }

  try {
    const ideas: TrendCampaignIdea[] = await generateTrendCampaignIdeas({
      user,
      calendarDateLabel,
      weekdayName,
      geminiApiKey: keys.geminiApiKey ?? null,
      optionalFocus,
    });

    await prisma.campaignIdeaDailyCache.upsert({
      where: {
        userId_dayKey_focusKey: { userId: session.user.id, dayKey, focusKey },
      },
      create: {
        userId: session.user.id,
        dayKey,
        focusKey,
        ideasJson: ideas,
        weekdayName,
        sourceGeneratedAt: now,
      },
      update: {
        ideasJson: ideas,
        weekdayName,
        sourceGeneratedAt: now,
      },
    });

    return NextResponse.json({
      generatedAt: now.toISOString(),
      calendarDateLabel,
      weekdayName,
      ideas,
      focusApplied: !!optionalFocus,
      fromCache: false,
    });
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Generation failed";
    const status = httpStatusForGeminiError(raw);
    const error = userFacingMessageFromGeminiError(raw);
    return NextResponse.json({ error }, { status });
  }
}
