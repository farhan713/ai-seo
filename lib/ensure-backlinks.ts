import { prisma } from "@/lib/prisma";
import { DEFAULT_BACKLINK_DIRECTORIES } from "@/lib/backlinks-default";
import { hasGrowthFeatures } from "@/lib/plan-access";

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

  await prisma.backlink.createMany({
    data: DEFAULT_BACKLINK_DIRECTORIES.map((d) => ({
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
      data: DEFAULT_BACKLINK_DIRECTORIES.map((d) => ({
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
