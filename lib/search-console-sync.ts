import { prisma } from "@/lib/prisma";
import { fetchSearchAnalyticsQueries } from "@/lib/search-console-google";
import { gscQueryKey } from "@/lib/gsc-query-key";
import { syncAutoTrackedKeywordsFromGsc } from "@/lib/tracked-keywords-bootstrap";

/** Last 28 days (inclusive end date), replaces rows for that window. */
export async function syncSearchConsoleForUser(userId: string): Promise<{
  ok: boolean;
  error?: string;
  rowCount?: number;
}> {
  const conn = await prisma.searchConsoleConnection.findUnique({ where: { userId } });
  if (!conn?.refreshToken || !conn.siteUrl) {
    return { ok: false, error: "Search Console is not connected or property is missing." };
  }

  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const periodStart = new Date(`${startStr}T00:00:00.000Z`);
  const periodEnd = new Date(`${endStr}T00:00:00.000Z`);

  try {
    const { rows, credentials } = await fetchSearchAnalyticsQueries({
      refreshToken: conn.refreshToken,
      accessToken: conn.accessToken,
      accessTokenExpiresAt: conn.accessTokenExpiresAt,
      siteUrl: conn.siteUrl,
      startDate: startStr,
      endDate: endStr,
      rowLimit: 500,
    });

    const data = rows
      .map((r) => {
        const q = (r.keys?.[0] ?? "").trim();
        if (!q) return null;
        return {
          userId,
          query: q.slice(0, 4000),
          queryKey: gscQueryKey(q),
          clicks: r.clicks ?? 0,
          impressions: r.impressions ?? 0,
          ctr: r.ctr ?? 0,
          position: r.position ?? 0,
          periodStart,
          periodEnd,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    await prisma.$transaction(async (tx) => {
      await tx.gscQueryRow.deleteMany({
        where: { userId, periodStart, periodEnd },
      });
      if (data.length > 0) {
        await tx.gscQueryRow.createMany({ data });
      }
    });

    await prisma.searchConsoleConnection.update({
      where: { userId },
      data: {
        accessToken: credentials.access_token ?? conn.accessToken,
        accessTokenExpiresAt: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : conn.accessTokenExpiresAt,
        lastSyncAt: new Date(),
        lastSyncError: null,
        periodStart,
        periodEnd,
      },
    });

    await syncAutoTrackedKeywordsFromGsc(userId).catch(() => {});

    return { ok: true, rowCount: data.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    await prisma.searchConsoleConnection.update({
      where: { userId },
      data: { lastSyncError: msg.slice(0, 2000) },
    });
    return { ok: false, error: msg };
  }
}
