import { prisma } from "@/lib/prisma";
import { DEFAULT_BACKLINK_DIRECTORIES } from "@/lib/backlinks-default";

/** Create default directory rows for a user if they have none */
export async function ensureDefaultBacklinksForUser(userId: string) {
  const count = await prisma.backlink.count({ where: { userId } });
  if (count > 0) return;

  await prisma.backlink.createMany({
    data: DEFAULT_BACKLINK_DIRECTORIES.map((d) => ({
      userId,
      directoryName: d.directoryName,
      directoryUrl: d.directoryUrl,
      priority: d.priority,
    })),
  });
}
