import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchPageSignalsForAudit } from "@/lib/page-fetch-audit";
import { runSiteAuditGemini } from "@/lib/site-audit";
import { hasAdCreativeAngles, hasAuditAccess } from "@/lib/plan-access";
import { parseClientProvidedKeys } from "@/lib/client-keys";
import { shouldIncludeLocalSeoPack } from "@/lib/marketing-presets";
import {
  lighthouseDualSummaryForPrompt,
  runPageSpeedLighthouseDual,
  type LighthouseDualBundle,
} from "@/lib/pagespeed-lighthouse";
import { normalizeWebsiteUrl } from "@/lib/url-normalize";
import { slimPageSnapshot } from "@/lib/audit-snapshot";
import { syncAutoTrackedKeywordsFromBusinessProfile } from "@/lib/tracked-keywords-bootstrap";

export const maxDuration = 120;

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
    return NextResponse.json({ error: "No active subscription" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.businessUrl) {
    return NextResponse.json({ error: "Set your website URL on your profile (ask admin)" }, { status: 400 });
  }

  let competitorUrl: string | undefined;
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const b = (await req.json()) as { competitorUrl?: string };
      if (typeof b.competitorUrl === "string" && b.competitorUrl.trim()) {
        competitorUrl = normalizeWebsiteUrl(b.competitorUrl.trim());
      }
    }
  } catch {
    /* optional body */
  }

  const url = normalizeWebsiteUrl(user.businessUrl);
  const clientKeys = parseClientProvidedKeys(user.clientProvidedKeys);

  const psiWebUrl = `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}`;

  const [primaryPage, psi] = await Promise.all([
    fetchPageSignalsForAudit(url),
    runPageSpeedLighthouseDual(url, clientKeys.pageSpeedApiKey).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : "Lighthouse failed";
      const fetchedAt = new Date().toISOString();
      const err = { error: msg, fetchedAt, psiWebUrl };
      const fallback: LighthouseDualBundle = {
        version: 2,
        psiWebUrl,
        fetchedAt,
        mobile: err,
        desktop: err,
      };
      return fallback;
    }),
  ]);

  const competitorPage =
    competitorUrl && competitorUrl.replace(/\/$/, "") !== url.replace(/\/$/, "")
      ? await fetchPageSignalsForAudit(competitorUrl)
      : null;

  const pageSnapshot = slimPageSnapshot(primaryPage, competitorUrl, competitorPage);

  const measuredHint = lighthouseDualSummaryForPrompt(psi);

  try {
    const audit = await runSiteAuditGemini({
      url,
      businessName: user.businessName,
      industry: user.industry,
      industryVertical: user.industryVertical,
      marketingGoal: user.marketingGoal,
      targetKeywords: user.targetKeywords,
      measuredWebVitalsHint: measuredHint,
      primaryPage,
      competitorPage,
      includeAdCreativeAngles: hasAdCreativeAngles(sub.plan),
      includeLocalSeoPack: shouldIncludeLocalSeoPack({
        localSeoPackEnabled: user.localSeoPackEnabled,
        marketingGoal: user.marketingGoal,
        industryVertical: user.industryVertical,
      }),
      geminiApiKey: clientKeys.geminiApiKey ?? null,
    });

    const row = await prisma.siteAudit.create({
      data: {
        userId: user.id,
        url,
        summary: audit.summary,
        findings: audit.findings as object[],
        lighthouse: psi as object,
        deliverables: audit.deliverables as object,
        pageSnapshot: pageSnapshot as object,
      },
    });

    await syncAutoTrackedKeywordsFromBusinessProfile(user.id).catch(() => {});

    return NextResponse.json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Audit failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

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
    return NextResponse.json({ error: "No plan with audit access" }, { status: 403 });
  }

  const [user, rows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { businessUrl: true },
    }),
    prisma.siteAudit.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const primaryUrl =
    user?.businessUrl && user.businessUrl.trim()
      ? normalizeWebsiteUrl(user.businessUrl.trim())
      : null;

  return NextResponse.json({ audits: rows, primaryUrl });
}
