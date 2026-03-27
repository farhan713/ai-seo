import { prisma } from "@/lib/prisma";
import { fetchPageSignalsForAudit } from "@/lib/page-fetch-audit";
import { aggregateStats, computeCrawlIssues, type CrawlIssue } from "@/lib/crawl-rules";
import { discoverCrawlUrls } from "@/lib/sitemap-discover";
import { normalizeWebsiteUrl } from "@/lib/url-normalize";

const CONCURRENCY = 4;

async function poolMap<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return out;
}

export async function runCrawlForStoredRun(runId: string): Promise<void> {
  const run = await prisma.crawlRun.findUnique({ where: { id: runId } });
  if (!run || run.status !== "RUNNING") return;

  const baseUrl = normalizeWebsiteUrl(run.baseUrl);
  try {
    const urls = await discoverCrawlUrls(baseUrl, run.maxPages);

    const results = await poolMap(urls, CONCURRENCY, async (url) => {
      const signals = await fetchPageSignalsForAudit(url);
      const issues: CrawlIssue[] = computeCrawlIssues(signals, url);
      return {
        url,
        finalUrl: signals.finalUrl ?? null,
        statusCode: signals.statusCode ?? null,
        ok: signals.ok,
        title: signals.title ?? null,
        metaDescription: signals.metaDescription ?? null,
        h1Count: signals.h1Texts.length,
        issues: issues as object[],
      };
    });

    const stats = aggregateStats(
      results.map((r) => ({
        ok: r.ok,
        statusCode: r.statusCode,
        issues: r.issues as CrawlIssue[],
      }))
    );

    await prisma.$transaction([
      prisma.crawlPage.createMany({
        data: results.map((r) => ({
          crawlRunId: runId,
          url: r.url,
          finalUrl: r.finalUrl,
          statusCode: r.statusCode,
          ok: r.ok,
          title: r.title,
          metaDescription: r.metaDescription,
          h1Count: r.h1Count,
          issues: r.issues,
        })),
      }),
      prisma.crawlRun.update({
        where: { id: runId },
        data: {
          status: "COMPLETE",
          pagesCrawled: results.length,
          stats: stats as object,
          completedAt: new Date(),
        },
      }),
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Crawl failed";
    await prisma.crawlRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        errorMessage: msg.slice(0, 500),
        completedAt: new Date(),
      },
    });
  }
}
