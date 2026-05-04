import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { parseIndustryVertical, parseMarketingGoal } from "@/lib/marketing-presets";
import { defaultsForPlan } from "@/lib/subscription-defaults";
import { ensureDefaultBacklinksForUser } from "@/lib/ensure-backlinks";
import { ensureTrackedKeywordsSeeded } from "@/lib/tracked-keywords-bootstrap";

/** Length of the auto-granted Elite trial for new self-signups. */
const ELITE_TRIAL_DAYS = 14;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "")
      .toLowerCase()
      .trim();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const businessName = String(body.businessName || "").trim();
    const businessUrl = String(body.businessUrl || "").trim() || null;
    const businessDescription = String(body.businessDescription || "").trim() || null;
    const industry = String(body.industry || "").trim() || null;
    const targetKeywords = String(body.targetKeywords || "").trim() || null;
    const iv = parseIndustryVertical(body.industryVertical);
    const mg = parseMarketingGoal(body.marketingGoal);
    if (body.industryVertical != null && body.industryVertical !== "" && !iv) {
      return NextResponse.json({ error: "Invalid industry vertical" }, { status: 400 });
    }
    if (body.marketingGoal != null && body.marketingGoal !== "" && !mg) {
      return NextResponse.json({ error: "Invalid marketing goal" }, { status: 400 });
    }
    let internalLinks: unknown = body.internalLinks;
    if (!Array.isArray(internalLinks)) internalLinks = [];

    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    }
    if (!name || !businessName) {
      return NextResponse.json({ error: "Name and business name are required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashed = await hashPassword(password);
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + ELITE_TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const trialDefaults = defaultsForPlan("ELITE_TRIAL");

    // Atomically create User + active ELITE_TRIAL Subscription so we never end
    // up with a registered user that has no plan.
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          password: hashed,
          role: "CLIENT",
          businessName,
          businessUrl,
          businessDescription,
          industry,
          industryVertical: iv ?? undefined,
          marketingGoal: mg ?? undefined,
          targetKeywords,
          internalLinks: internalLinks as object[],
        },
      });

      await tx.subscription.create({
        data: {
          userId: user.id,
          plan: "ELITE_TRIAL",
          status: "ACTIVE",
          priceInInr: trialDefaults.priceInInr,
          blogsPerWeek: trialDefaults.blogsPerWeek,
          backlinksPerMonth: trialDefaults.backlinksPerMonth,
          startDate: now,
          endDate: trialEndsAt,
        },
      });

      return user;
    });

    // Best-effort post-creation bootstrap (mirrors /api/admin/subscriptions for
    // ACTIVE Growth/Elite plans). Failures here must not block registration —
    // the dashboard's own ensure functions will retry on first page load.
    await ensureDefaultBacklinksForUser(created.id).catch((e) => {
      console.warn(
        `[register] ensureDefaultBacklinksForUser failed for ${created.email}:`,
        e instanceof Error ? e.message : e
      );
    });
    await ensureTrackedKeywordsSeeded(created.id).catch((e) => {
      console.warn(
        `[register] ensureTrackedKeywordsSeeded failed for ${created.email}:`,
        e instanceof Error ? e.message : e
      );
    });

    return NextResponse.json({
      ok: true,
      trial: {
        plan: "ELITE_TRIAL",
        endsAt: trialEndsAt.toISOString(),
        days: ELITE_TRIAL_DAYS,
      },
    });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
