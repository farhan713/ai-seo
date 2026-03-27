import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { upsertEliteSocialDraft } from "@/lib/social-elite-draft";

/** Manually generate today's ad draft (Elite). Cron can call the same logic. Posting to Meta requires app review + tokens. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const context = String(body.context || "General promotion this week");

  try {
    const ad = await upsertEliteSocialDraft(userId, context);
    return NextResponse.json(ad);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    const status = msg.includes("Elite") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
