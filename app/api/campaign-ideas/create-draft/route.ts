import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasCampaignIdeaSocialDraft } from "@/lib/plan-access";
import { parseClientProvidedKeys } from "@/lib/client-keys";
import { buildCampaignIdeaAdContext, type TrendCampaignIdea } from "@/lib/gemini-campaign-ideas";
import { upsertEliteSocialDraft } from "@/lib/social-elite-draft";

function parseIdea(body: unknown): TrendCampaignIdea | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const hook = typeof o.hook === "string" ? o.hook.trim() : "";
  const rationale = typeof o.rationale === "string" ? o.rationale.trim() : "";
  if (!title || !hook || !rationale) return null;
  const formatRaw = typeof o.format === "string" ? o.format : "post";
  const fmt = ["reel", "post", "carousel", "story", "other"].includes(formatRaw) ? formatRaw : "other";
  return {
    title,
    hook,
    format: fmt as TrendCampaignIdea["format"],
    rationale,
    trendOrOccasion: typeof o.trendOrOccasion === "string" ? o.trendOrOccasion.trim() : "",
    suggestedHashtags: typeof o.suggestedHashtags === "string" ? o.suggestedHashtags.trim() : "",
  };
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
  if (!sub || !hasCampaignIdeaSocialDraft(sub.plan)) {
    return NextResponse.json(
      { error: "Only Elite can create Social ad drafts from an idea here." },
      { status: 403 }
    );
  }

  const json = (await req.json().catch(() => ({}))) as { idea?: unknown };
  const idea = parseIdea(json.idea);
  if (!idea) {
    return NextResponse.json({ error: "Invalid idea payload" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { clientProvidedKeys: true },
  });
  const keys = parseClientProvidedKeys(user?.clientProvidedKeys);

  const context = buildCampaignIdeaAdContext(idea);

  try {
    const ad = await upsertEliteSocialDraft(session.user.id, context, {
      geminiApiKey: keys.geminiApiKey ?? null,
    });
    return NextResponse.json({
      ok: true,
      socialAd: {
        id: ad.id,
        dateKey: ad.dateKey,
        caption: ad.caption,
        imageUrl: ad.imageUrl,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Draft failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
