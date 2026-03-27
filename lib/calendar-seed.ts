import { prisma } from "@/lib/prisma";
import { clampDeliverables, type AuditDeliverables } from "@/lib/site-audit";

export async function seedCalendarFromAuditPillars(params: {
  userId: string;
  auditId: string;
  maxToAdd: number;
}): Promise<{ added: number }> {
  const audit = await prisma.siteAudit.findFirst({
    where: { id: params.auditId, userId: params.userId },
    select: { deliverables: true },
  });
  if (!audit?.deliverables) return { added: 0 };

  const d = clampDeliverables(audit.deliverables as Partial<AuditDeliverables>);
  const pillars = d.contentPillarIdeas.filter(Boolean);
  if (pillars.length === 0) return { added: 0 };

  const existingTitles = new Set(
    (
      await prisma.contentCalendarItem.findMany({
        where: { userId: params.userId },
        select: { title: true },
      })
    ).map((x) => x.title)
  );

  let added = 0;
  let day = 0;
  for (const title of pillars) {
    if (added >= params.maxToAdd) break;
    if (existingTitles.has(title.slice(0, 500))) continue;
    const due = new Date();
    due.setUTCDate(due.getUTCDate() + 7 + day * 3);
    day += 1;
    await prisma.contentCalendarItem.create({
      data: {
        userId: params.userId,
        title: title.slice(0, 500),
        brief: `From audit content pillar idea.`,
        dueDate: due,
        status: "PLANNED",
        sourceAuditId: params.auditId,
      },
    });
    existingTitles.add(title.slice(0, 500));
    added++;
  }
  return { added };
}
