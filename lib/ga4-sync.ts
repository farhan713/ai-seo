import { prisma } from "@/lib/prisma";
import { fetchGa4Summary } from "@/lib/ga4-google";

export async function syncGa4ForUser(userId: string): Promise<void> {
  const row = await prisma.ga4Connection.findUnique({ where: { userId } });
  if (!row) throw new Error("GA4 not connected");
  const pid = row.propertyId?.trim();
  if (!pid) throw new Error("Set your GA4 Property ID in Web analytics after connecting Google");

  try {
    const { summary, credentials } = await fetchGa4Summary({
      refreshToken: row.refreshToken,
      accessToken: row.accessToken,
      accessTokenExpiresAt: row.accessTokenExpiresAt,
      propertyId: pid,
    });

    await prisma.ga4Connection.update({
      where: { userId },
      data: {
        summaryJson: summary as object,
        lastSyncAt: new Date(),
        lastSyncError: null,
        accessToken: credentials.access_token ?? row.accessToken,
        accessTokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : row.accessTokenExpiresAt,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "GA4 sync failed";
    await prisma.ga4Connection.update({
      where: { userId },
      data: { lastSyncError: msg.slice(0, 500), lastSyncAt: new Date() },
    });
    throw e;
  }
}
