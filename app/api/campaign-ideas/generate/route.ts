import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasTrendCampaignIdeas } from "@/lib/plan-access";
import { parseClientProvidedKeys } from "@/lib/client-keys";
import { generateTrendCampaignIdeas } from "@/lib/gemini-campaign-ideas";

const MAX_FOCUS = 2000;

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

  const body = (await req.json().catch(() => ({}))) as { focus?: unknown };
  let optionalFocus: string | null = null;
  if (typeof body.focus === "string") {
    const t = body.focus.trim().slice(0, MAX_FOCUS);
    optionalFocus = t.length > 0 ? t : null;
  }

  try {
    const ideas = await generateTrendCampaignIdeas({
      user,
      calendarDateLabel,
      weekdayName,
      geminiApiKey: keys.geminiApiKey ?? null,
      optionalFocus,
    });
    return NextResponse.json({
      generatedAt: now.toISOString(),
      calendarDateLabel,
      weekdayName,
      ideas,
      focusApplied: !!optionalFocus,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
