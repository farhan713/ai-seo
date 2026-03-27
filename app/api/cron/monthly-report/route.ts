import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMonthlyReportForUser } from "@/lib/monthly-report-send";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const h = req.headers.get("authorization");
  return h === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return NextResponse.json({ error: "Resend not configured" }, { status: 503 });
  }

  const users = await prisma.user.findMany({
    where: {
      role: "CLIENT",
      monthlyExecutiveReportOptIn: true,
      subscriptions: {
        some: {
          status: "ACTIVE",
          plan: { in: ["GROWTH_899", "ELITE_1599"] },
        },
      },
    },
    select: { id: true },
  });

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const u of users) {
    const r = await sendMonthlyReportForUser(u.id);
    results.push({ id: u.id, ok: r.ok, error: r.error });
  }

  const sent = results.filter((x) => x.ok).length;
  return NextResponse.json({ processed: users.length, sent, results });
}
