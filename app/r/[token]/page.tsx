import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ReportShareSnapshotV1 } from "@/lib/report-share-snapshot";

export const dynamic = "force-dynamic";

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length > 64) notFound();

  const share = await prisma.reportShare.findUnique({
    where: { token },
  });
  if (!share || share.expiresAt < new Date()) notFound();

  const snap = share.snapshotJson as unknown as ReportShareSnapshotV1;
  if (!snap || snap.version !== 1) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Read-only client report</p>
      <h1 className="mt-2 text-center text-2xl font-bold text-slate-900">
        {snap.businessName || "Growth snapshot"}
      </h1>
      <p className="mt-1 text-center text-sm text-slate-600">{snap.planLabel}</p>
      <p className="mt-6 text-center text-xs text-slate-500">
        Shared link · expires {share.expiresAt.toLocaleString()}
      </p>

      <div className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {snap.growthScore != null ? (
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <span className="text-sm font-medium text-slate-700">Growth score</span>
            <span className="text-2xl font-black tabular-nums text-teal-800">
              {snap.growthScore}
              <span className="text-sm font-semibold text-slate-500">/100</span>
            </span>
          </div>
        ) : null}
        {snap.lastAuditAt ? (
          <p className="text-sm text-slate-700">
            <strong className="text-slate-900">Last audit:</strong>{" "}
            {new Date(snap.lastAuditAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </p>
        ) : null}
        {snap.auditSummary ? (
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Audit summary</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-800">{snap.auditSummary}</p>
          </div>
        ) : null}
        <p className="text-sm text-slate-700">
          <strong className="text-slate-900">Keywords tracked:</strong> {snap.keywordsTracked}
        </p>
        {snap.auditProgressSummary ? (
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Progress</p>
            <p className="mt-1 text-sm text-slate-800">{snap.auditProgressSummary}</p>
          </div>
        ) : null}
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        Generated {new Date(snap.generatedAt).toLocaleString()} · AI SEO Tool
      </p>
    </div>
  );
}
