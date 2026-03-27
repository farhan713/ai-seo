import type { IndustryVertical, TrackedKeywordSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { gscQueryKey } from "@/lib/gsc-query-key";
import { INDUSTRY_VERTICAL_OPTIONS } from "@/lib/marketing-presets";
import { trackedKeywordLimit } from "@/lib/tracked-keyword-limit";

export function normalizeTrackedPhrase(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 500);
}

export function phraseKeyFromPhrase(phrase: string): string {
  return gscQueryKey(normalizeTrackedPhrase(phrase).toLowerCase());
}

function parseDelimitedList(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/[,;\n\r]+/)
    .map((s) => normalizeTrackedPhrase(s))
    .filter((s) => s.length >= 2 && s.length <= 500);
}

function verticalHint(vertical: IndustryVertical): string | null {
  const o = INDUSTRY_VERTICAL_OPTIONS.find((x) => x.value === vertical);
  const label = o?.label;
  if (!label) return null;
  if (label.length > 80) return null;
  return label;
}

function parsePillarsFromDeliverables(deliverables: unknown): string[] {
  if (!deliverables || typeof deliverables !== "object") return [];
  const arr = (deliverables as Record<string, unknown>).contentPillarIdeas;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => normalizeTrackedPhrase(String(x)))
    .filter((s) => s.length >= 3 && s.length <= 500)
    .slice(0, 6);
}

async function activePlanForUser(userId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { plan: true },
  });
  return sub?.plan ?? null;
}

async function existingPhraseKeys(userId: string): Promise<Set<string>> {
  const rows = await prisma.trackedKeyword.findMany({
    where: { userId },
    select: { phraseKey: true },
  });
  return new Set(rows.map((r) => r.phraseKey));
}

/**
 * Adds keywords from targetKeywords, industry, business name, vertical label, and latest audit pillars.
 * Skips duplicates; respects plan limit.
 */
export async function syncAutoTrackedKeywordsFromBusinessProfile(userId: string): Promise<{ added: number }> {
  const plan = await activePlanForUser(userId);
  const limit = trackedKeywordLimit(plan);
  if (limit <= 0) return { added: 0 };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      targetKeywords: true,
      industry: true,
      businessName: true,
      industryVertical: true,
    },
  });
  if (!user) return { added: 0 };

  const latest = await prisma.siteAudit.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { deliverables: true },
  });
  const pillars = parsePillarsFromDeliverables(latest?.deliverables);

  const existingKeys = await existingPhraseKeys(userId);
  let room = limit - existingKeys.size;
  if (room <= 0) return { added: 0 };

  const ordered: { phrase: string; source: TrackedKeywordSource }[] = [];
  for (const p of parseDelimitedList(user.targetKeywords)) {
    ordered.push({ phrase: p, source: "AUTO_PROFILE" });
  }
  for (const p of parseDelimitedList(user.industry)) {
    ordered.push({ phrase: p, source: "AUTO_PROFILE" });
  }
  if (user.businessName?.trim()) {
    const bn = normalizeTrackedPhrase(user.businessName);
    if (bn.length >= 2 && bn.length <= 120) {
      ordered.push({ phrase: bn, source: "AUTO_PROFILE" });
    }
  }
  const vh = verticalHint(user.industryVertical);
  if (vh) {
    ordered.push({ phrase: vh, source: "AUTO_PROFILE" });
  }
  for (const p of pillars) {
    ordered.push({ phrase: p, source: "AUTO_AUDIT" });
  }

  const seen = new Set<string>();
  const deduped: typeof ordered = [];
  for (const item of ordered) {
    const k = phraseKeyFromPhrase(item.phrase);
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(item);
  }

  let added = 0;
  for (const item of deduped) {
    if (room <= 0) break;
    const k = phraseKeyFromPhrase(item.phrase);
    if (existingKeys.has(k)) continue;
    await prisma.trackedKeyword.create({
      data: {
        userId,
        phrase: item.phrase,
        phraseKey: k,
        source: item.source,
      },
    });
    existingKeys.add(k);
    room--;
    added++;
  }
  return { added };
}

/**
 * Fills remaining slots with top Search Console queries (after profile/audit seeds).
 */
export async function syncAutoTrackedKeywordsFromGsc(userId: string): Promise<{ added: number }> {
  const plan = await activePlanForUser(userId);
  const limit = trackedKeywordLimit(plan);
  if (limit <= 0) return { added: 0 };

  const existingKeys = await existingPhraseKeys(userId);
  let room = limit - existingKeys.size;
  if (room <= 0) return { added: 0 };

  const rows = await prisma.gscQueryRow.findMany({
    where: { userId },
    orderBy: [{ clicks: "desc" }, { impressions: "desc" }],
    take: 60,
    select: { query: true },
  });

  let added = 0;
  for (const row of rows) {
    if (room <= 0) break;
    const phrase = normalizeTrackedPhrase(row.query);
    if (phrase.length < 2) continue;
    const k = phraseKeyFromPhrase(phrase);
    if (existingKeys.has(k)) continue;
    await prisma.trackedKeyword.create({
      data: { userId, phrase, phraseKey: k, source: "AUTO_GSC" },
    });
    existingKeys.add(k);
    room--;
    added++;
  }
  return { added };
}

export async function ensureTrackedKeywordsSeeded(userId: string): Promise<void> {
  await syncAutoTrackedKeywordsFromBusinessProfile(userId);
  await syncAutoTrackedKeywordsFromGsc(userId);
}
