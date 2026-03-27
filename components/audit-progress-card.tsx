import type { AuditProgressModel } from "@/lib/audit-before-after";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function fmtDelta(n: number | null) {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}`;
}

export function AuditProgressCard({ model }: { model: AuditProgressModel }) {
  const { hasComparison, firstAt, latestAt, metricRows, opportunityFirst, opportunityLatest, opportunityDelta } = model;

  return (
    <div className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">Audit progress</h2>
          <p className="mt-1 text-xs text-muted">
            Lighthouse lab scores (mobile-first) and opportunity index from your audits.
          </p>
        </div>
      </div>

      {!hasComparison ? (
        <p className="mt-4 text-sm text-muted">
          Run a second site audit to see before/after. First snapshot: {fmtDate(firstAt)} · Latest:{" "}
          {fmtDate(latestAt)}.
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs text-muted">
            Comparing first audit ({fmtDate(firstAt)}) to latest ({fmtDate(latestAt)}).
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Metric</th>
                  <th className="py-2 pr-3 tabular-nums">First</th>
                  <th className="py-2 pr-3 tabular-nums">Latest</th>
                  <th className="py-2 tabular-nums">Change</th>
                </tr>
              </thead>
              <tbody>
                {metricRows.map((row) => (
                  <tr key={row.key} className="border-b border-slate-50">
                    <td className="py-2 pr-3 font-medium text-slate-800">{row.label}</td>
                    <td className="py-2 pr-3 tabular-nums text-muted">{row.first ?? "—"}</td>
                    <td className="py-2 pr-3 tabular-nums text-slate-800">{row.latest ?? "—"}</td>
                    <td
                      className={`py-2 tabular-nums font-medium ${
                        row.delta == null
                          ? "text-muted"
                          : row.delta > 0
                            ? "text-emerald-700"
                            : row.delta < 0
                              ? "text-red-700"
                              : "text-slate-600"
                      }`}
                    >
                      {fmtDelta(row.delta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(opportunityFirst != null || opportunityLatest != null) && (
            <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm">
              <span className="font-medium text-slate-800">Opportunity index</span>
              <span className="ml-2 tabular-nums text-muted">
                {opportunityFirst ?? "—"} → {opportunityLatest ?? "—"}
                {opportunityDelta != null ? (
                  <span
                    className={`ml-2 font-semibold ${
                      opportunityDelta > 0 ? "text-emerald-700" : opportunityDelta < 0 ? "text-red-700" : "text-slate-600"
                    }`}
                  >
                    ({fmtDelta(opportunityDelta)})
                  </span>
                ) : null}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
