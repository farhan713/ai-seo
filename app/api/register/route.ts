import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { parseIndustryVertical, parseMarketingGoal } from "@/lib/marketing-presets";

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
    await prisma.user.create({
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

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
