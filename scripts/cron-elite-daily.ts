#!/usr/bin/env -S npx tsx
/**
 * Daily 9 AM IST (03:30 UTC) cron for Elite + Elite-Trial users.
 *
 * For each active Elite/Elite-trial subscriber, drops a fresh batch of 10
 * backlinks AND generates 2 AI blog posts. Idempotent per UTC-day per user.
 *
 * Crontab on the VPS:
 *   30 3 * * *  cd /var/www/aiseotool && /root/.nvm/versions/node/v22.14.0/bin/npx tsx scripts/cron-elite-daily.ts >> /var/log/seodashpro-elite-cron.log 2>&1
 *
 * NB: blogsPerWeek defaults bumped to 14 for Elite plans, but the cron passes
 * { bypassWeeklyCap: true } as a safety net so a manual blog earlier in the
 * day never blocks the cron.
 */
import { prisma } from "../lib/prisma";
import { hasDailyEliteCadence } from "../lib/plan-access";
import { pickDailyBacklinkSlice } from "../lib/backlinks-default";
import { createBlogForUser } from "../lib/blog-service";

const TODAY_UTC = new Date();
const DAY_KEY = TODAY_UTC.toISOString().slice(0, 10); // YYYY-MM-DD

function log(...args: unknown[]) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

async function ensureBacklinksForUser(userId: string, currentBatch: number): Promise<{ added: number; nextBatch: number; skipped: boolean }> {
  // Idempotency: skip if any backlink was already created for this user today.
  const todayCount = await prisma.backlink.count({
    where: {
      userId,
      createdAt: { gte: new Date(`${DAY_KEY}T00:00:00.000Z`) },
    },
  });
  if (todayCount > 0) return { added: 0, nextBatch: currentBatch, skipped: true };

  const slice = pickDailyBacklinkSlice(TODAY_UTC, 10);
  const nextBatch = currentBatch + 1;

  await prisma.$transaction([
    prisma.backlink.createMany({
      data: slice.map((d) => ({
        userId,
        batch: nextBatch,
        directoryName: d.directoryName,
        directoryUrl: d.directoryUrl,
        priority: d.priority,
      })),
    }),
    prisma.subscription.updateMany({
      where: { userId, status: "ACTIVE" },
      data: {
        backlinkBatch: nextBatch,
        backlinkBatchDone: false,
        nextBacklinkBatchAt: null,
      },
    }),
  ]);

  return { added: slice.length, nextBatch, skipped: false };
}

async function ensureBlogsForUser(userId: string, target = 2): Promise<{ generated: number; skipped: boolean; errors: string[] }> {
  // Idempotency: count blogs created today; only generate the diff up to target.
  const todayBlogCount = await prisma.blog.count({
    where: {
      userId,
      createdAt: { gte: new Date(`${DAY_KEY}T00:00:00.000Z`) },
    },
  });
  if (todayBlogCount >= target) return { generated: 0, skipped: true, errors: [] };

  const need = target - todayBlogCount;
  const errors: string[] = [];
  let generated = 0;
  for (let i = 0; i < need; i++) {
    try {
      const blog = await createBlogForUser(userId, { bypassWeeklyCap: true });
      log(`  blog ${i + 1}/${need} created: id=${blog.id} slug=${blog.slug}`);
      generated += 1;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      log(`  blog ${i + 1}/${need} FAILED:`, msg);
      errors.push(msg);
      // If Claude is rate-limited, stop trying for this user — pick up tomorrow.
      if (/rate.?limit|usage limit|429/i.test(msg)) break;
    }
  }
  return { generated, skipped: false, errors };
}

async function main() {
  log("=== Elite daily cron starting ===");
  log("dayKey:", DAY_KEY);

  const subs = await prisma.subscription.findMany({
    where: { status: "ACTIVE" },
    include: { user: { select: { id: true, email: true, isActive: true } } },
    orderBy: { createdAt: "asc" },
  });
  const eligible = subs.filter((s) => s.user.isActive && hasDailyEliteCadence(s.plan));
  log(`active subs: ${subs.length}, elite eligible: ${eligible.length}`);

  let totalBacklinks = 0;
  let totalBlogs = 0;
  let userErrors = 0;

  for (const sub of eligible) {
    const u = sub.user;
    log(`\nuser: ${u.email} (plan=${sub.plan})`);
    try {
      const bl = await ensureBacklinksForUser(u.id, sub.backlinkBatch);
      if (bl.skipped) log(`  backlinks: already ran today, skipped`);
      else log(`  backlinks: +${bl.added}, batch now ${bl.nextBatch}`);
      totalBacklinks += bl.added;

      const bg = await ensureBlogsForUser(u.id, 2);
      if (bg.skipped) log(`  blogs: target met (${2}/${2}), skipped`);
      else log(`  blogs: generated ${bg.generated}/${2 - (bg.errors.length ? bg.errors.length : 0)}`);
      totalBlogs += bg.generated;
    } catch (e: unknown) {
      userErrors += 1;
      log(`  USER ERROR:`, e instanceof Error ? e.message : String(e));
    }
  }

  log(`\n=== Done ===`);
  log(`users processed: ${eligible.length}, backlinks added: ${totalBacklinks}, blogs generated: ${totalBlogs}, user errors: ${userErrors}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  log("FATAL:", e);
  await prisma.$disconnect();
  process.exit(1);
});
