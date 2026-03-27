import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { parseIndustryVertical, parseMarketingGoal } from "@/lib/marketing-presets";
import { syncAutoTrackedKeywordsFromBusinessProfile } from "@/lib/tracked-keywords-bootstrap";
import { hasMonthlyExecutiveReport } from "@/lib/plan-access";
import { mergeClientProvidedKeysPatch, parseClientProvidedKeys } from "@/lib/client-keys";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      businessName: true,
      businessUrl: true,
      businessDescription: true,
      industry: true,
      industryVertical: true,
      marketingGoal: true,
      targetKeywords: true,
      internalLinks: true,
      monthlyExecutiveReportOptIn: true,
      localSeoPackEnabled: true,
      clientProvidedKeys: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const k = parseClientProvidedKeys(user.clientProvidedKeys);
  const { clientProvidedKeys, ...rest } = user;
  void clientProvidedKeys;
  return NextResponse.json({
    ...rest,
    hasGeminiKey: !!k.geminiApiKey,
    hasPageSpeedKey: !!k.pageSpeedApiKey,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Prisma.UserUpdateInput = {};

  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (typeof body.businessName === "string" || body.businessName === null) {
    data.businessName = body.businessName === null ? null : body.businessName.trim();
  }
  if (typeof body.businessUrl === "string" || body.businessUrl === null) {
    data.businessUrl = body.businessUrl === null ? null : body.businessUrl.trim();
  }
  if (typeof body.businessDescription === "string" || body.businessDescription === null) {
    data.businessDescription =
      body.businessDescription === null ? null : body.businessDescription.trim();
  }
  if (typeof body.industry === "string" || body.industry === null) {
    data.industry = body.industry === null ? null : body.industry.trim();
  }
  if (typeof body.targetKeywords === "string" || body.targetKeywords === null) {
    data.targetKeywords = body.targetKeywords === null ? null : body.targetKeywords.trim();
  }
  if (body.industryVertical !== undefined) {
    const v = parseIndustryVertical(body.industryVertical);
    if (!v) {
      return NextResponse.json({ error: "Invalid industryVertical" }, { status: 400 });
    }
    data.industryVertical = v;
  }
  if (body.marketingGoal !== undefined) {
    const g = parseMarketingGoal(body.marketingGoal);
    if (!g) {
      return NextResponse.json({ error: "Invalid marketingGoal" }, { status: 400 });
    }
    data.marketingGoal = g;
  }
  if (body.internalLinks !== undefined) {
    data.internalLinks = body.internalLinks as Prisma.InputJsonValue;
  }
  if (typeof body.monthlyExecutiveReportOptIn === "boolean") {
    const sub = await prisma.subscription.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    const allowed = sub && hasMonthlyExecutiveReport(sub.plan);
    data.monthlyExecutiveReportOptIn = allowed ? body.monthlyExecutiveReportOptIn : false;
  }

  if (typeof body.localSeoPackEnabled === "boolean") {
    data.localSeoPackEnabled = body.localSeoPackEnabled;
  }

  if (body.geminiApiKey !== undefined || body.pageSpeedApiKey !== undefined) {
    const cur = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { clientProvidedKeys: true },
    });
    const gemPatch =
      body.geminiApiKey === undefined
        ? undefined
        : typeof body.geminiApiKey === "string"
          ? body.geminiApiKey.trim() || null
          : body.geminiApiKey === null
            ? null
            : undefined;
    const psPatch =
      body.pageSpeedApiKey === undefined
        ? undefined
        : typeof body.pageSpeedApiKey === "string"
          ? body.pageSpeedApiKey.trim() || null
          : body.pageSpeedApiKey === null
            ? null
            : undefined;
    const next = mergeClientProvidedKeysPatch(cur?.clientProvidedKeys, {
      geminiApiKey: gemPatch,
      pageSpeedApiKey: psPatch,
    });
    data.clientProvidedKeys = next as Prisma.InputJsonValue;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      name: true,
      email: true,
      businessName: true,
      businessUrl: true,
      businessDescription: true,
      industry: true,
      industryVertical: true,
      marketingGoal: true,
      targetKeywords: true,
      internalLinks: true,
      monthlyExecutiveReportOptIn: true,
      localSeoPackEnabled: true,
      clientProvidedKeys: true,
    },
  });

  if (
    data.targetKeywords !== undefined ||
    data.industry !== undefined ||
    data.businessName !== undefined ||
    data.industryVertical !== undefined
  ) {
    await syncAutoTrackedKeywordsFromBusinessProfile(session.user.id).catch(() => {});
  }

  const k = parseClientProvidedKeys(user.clientProvidedKeys);
  const { clientProvidedKeys: ck, ...rest } = user;
  void ck;
  return NextResponse.json({
    ...rest,
    hasGeminiKey: !!k.geminiApiKey,
    hasPageSpeedKey: !!k.pageSpeedApiKey,
  });
}
