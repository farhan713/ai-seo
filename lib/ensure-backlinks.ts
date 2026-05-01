import { prisma } from "@/lib/prisma";
import {
  pickDirectoriesForUser,
  type DirectoryEntry,
  type UserProfileForDirectories,
} from "@/lib/backlinks-default";
import { hasGrowthFeatures } from "@/lib/plan-access";
import { parseClientProvidedKeys } from "@/lib/client-keys";
import {
  generateBusinessBacklinkPlan,
  type BusinessAnalysisInput,
  type GeneratedDirectory,
} from "@/lib/gemini-backlinks";

/** Next Monday 00:00 UTC after `from` (if `from` is Monday, returns the following Monday). */
function nextMondayUtc(from: Date): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDay();
  let add = (8 - day) % 7;
  if (add === 0) add = 7;
  if (day === 0) add = 1;
  d.setUTCDate(d.getUTCDate() + add);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

type GenerationInputs = {
  analysisInput: BusinessAnalysisInput;
  fallbackProfile: UserProfileForDirectories;
  geminiApiKey: string | null;
};

async function loadGenerationInputs(userId: string): Promise<GenerationInputs | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      businessName: true,
      businessUrl: true,
      businessDescription: true,
      industry: true,
      industryVertical: true,
      clientProvidedKeys: true,
    },
  });
  if (!u) return null;

  const keys = parseClientProvidedKeys(u.clientProvidedKeys);

  return {
    analysisInput: {
      businessName: u.businessName,
      businessUrl: u.businessUrl,
      businessDescription: u.businessDescription,
      industry: u.industry,
      industryVertical: u.industryVertical,
    },
    fallbackProfile: {
      businessUrl: u.businessUrl,
      industry: u.industry,
      industryVertical: u.industryVertical,
    },
    geminiApiKey: keys.geminiApiKey ?? null,
  };
}

/** Coerce a Gemini-generated directory list and a deterministic fallback list into the shared shape. */
function asDirectoryEntries(generated: GeneratedDirectory[]): DirectoryEntry[] {
  return generated.map((g) => ({
    directoryName: g.directoryName,
    directoryUrl: g.directoryUrl,
    priority: g.priority,
  }));
}

/**
 * Try Gemini first when we have a website to analyze, otherwise (or on failure)
 * use the deterministic picker so the page never breaks.
 */
async function pickDirectoriesForGeneration(inputs: GenerationInputs): Promise<DirectoryEntry[]> {
  const hasUrl = !!inputs.analysisInput.businessUrl?.trim();
  if (hasUrl) {
    try {
      const plan = await generateBusinessBacklinkPlan({
        user: inputs.analysisInput,
        geminiApiKey: inputs.geminiApiKey,
      });
      if (plan.directories.length >= 5) {
        return asDirectoryEntries(plan.directories);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(
        `[backlinks] Gemini-driven generation failed, falling back to deterministic picker: ${msg}`
      );
    }
  }
  return pickDirectoriesForUser(inputs.fallbackProfile);
}

/** Ensure current batch rows exist for Growth/Elite plans */
export async function ensureDefaultBacklinksForUser(userId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!sub || !hasGrowthFeatures(sub.plan)) return;

  const batch = sub.backlinkBatch;
  const count = await prisma.backlink.count({ where: { userId, batch } });
  if (count > 0) return;

  const inputs = await loadGenerationInputs(userId);
  if (!inputs) return;

  const directories = await pickDirectoriesForGeneration(inputs);
  if (directories.length === 0) return;

  await prisma.backlink.createMany({
    data: directories.map((d) => ({
      userId,
      batch,
      directoryName: d.directoryName,
      directoryUrl: d.directoryUrl,
      priority: d.priority,
    })),
  });
}

/** If scheduled time passed, roll to next weekly batch of 10 directories */
export async function maybeRollForwardBacklinkBatch(userId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!sub || !hasGrowthFeatures(sub.plan)) return;
  if (!sub.backlinkBatchDone || !sub.nextBacklinkBatchAt) return;
  if (new Date() < sub.nextBacklinkBatchAt) return;

  const inputs = await loadGenerationInputs(userId);
  if (!inputs) return;

  const directories = await pickDirectoriesForGeneration(inputs);
  if (directories.length === 0) return;

  const nextBatch = sub.backlinkBatch + 1;
  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: sub.id },
      data: {
        backlinkBatch: nextBatch,
        backlinkBatchDone: false,
        nextBacklinkBatchAt: null,
      },
    }),
    prisma.backlink.createMany({
      data: directories.map((d) => ({
        userId,
        batch: nextBatch,
        directoryName: d.directoryName,
        directoryUrl: d.directoryUrl,
        priority: d.priority,
      })),
    }),
  ]);
}

/** When all 10 in the active batch are no longer PENDING, schedule next batch for next Monday UTC */
export async function checkBacklinkBatchCompletion(userId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!sub || !hasGrowthFeatures(sub.plan)) return;
  if (sub.backlinkBatchDone) return;

  const batch = sub.backlinkBatch;
  const items = await prisma.backlink.findMany({ where: { userId, batch } });
  if (items.length < 10) return;
  const allDone = items.every((b) => b.status !== "PENDING");
  if (!allDone) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      backlinkBatchDone: true,
      nextBacklinkBatchAt: nextMondayUtc(new Date()),
    },
  });
}

/**
 * Replace PENDING rows in the active batch with a freshly analyzed pick for the user.
 * Preserves SUBMITTED / VERIFIED rows so the user does not lose progress.
 * On Gemini failure, falls back to the deterministic picker.
 * Returns counts useful for UI feedback.
 */
export async function refreshPendingBacklinksForUser(userId: string): Promise<{
  removed: number;
  added: number;
  kept: number;
  source: "ai" | "fallback";
}> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!sub || !hasGrowthFeatures(sub.plan)) {
    return { removed: 0, added: 0, kept: 0, source: "fallback" };
  }

  const inputs = await loadGenerationInputs(userId);
  if (!inputs) return { removed: 0, added: 0, kept: 0, source: "fallback" };

  const batch = sub.backlinkBatch;
  const existing = await prisma.backlink.findMany({ where: { userId, batch } });
  const kept = existing.filter((b) => b.status !== "PENDING");
  const keptUrls = new Set(kept.map((b) => b.directoryUrl.toLowerCase()));

  let source: "ai" | "fallback" = "fallback";
  let picks: DirectoryEntry[] = [];

  if (inputs.analysisInput.businessUrl?.trim()) {
    try {
      const plan = await generateBusinessBacklinkPlan({
        user: inputs.analysisInput,
        geminiApiKey: inputs.geminiApiKey,
      });
      if (plan.directories.length >= 5) {
        picks = asDirectoryEntries(plan.directories);
        source = "ai";
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(
        `[backlinks] refresh: Gemini generation failed, falling back to deterministic picker: ${msg}`
      );
    }
  }
  if (picks.length === 0) {
    picks = pickDirectoriesForUser(inputs.fallbackProfile);
  }

  const newOnes = picks.filter((p) => !keptUrls.has(p.directoryUrl.toLowerCase()));

  const removedRes = await prisma.backlink.deleteMany({
    where: { userId, batch, status: "PENDING" },
  });

  if (newOnes.length > 0) {
    await prisma.backlink.createMany({
      data: newOnes.map((d) => ({
        userId,
        batch,
        directoryName: d.directoryName,
        directoryUrl: d.directoryUrl,
        priority: d.priority,
      })),
    });
  }

  return { removed: removedRes.count, added: newOnes.length, kept: kept.length, source };
}
