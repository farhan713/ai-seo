"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  directoryName: string;
  directoryUrl: string;
  priority: string;
  status: string;
};

export default function BacklinksPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/backlinks");
    if (res.ok) setRows(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: "PENDING" | "SUBMITTED" | "VERIFIED") {
    await fetch(`/api/backlinks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  if (loading) {
    return <div className="text-sm text-muted">Loading directories…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Backlink checklist</h1>
        <p className="mt-1 text-sm text-muted">
          Claim and update your business on these directories. Mark each when submitted or verified.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <a
                  href={r.directoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  {r.directoryName}
                </a>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                  <span className="rounded bg-slate-100 px-2 py-0.5">{r.priority}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5">{r.status}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateStatus(r.id, "PENDING")}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(r.id, "SUBMITTED")}
                  className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
                >
                  Submitted
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(r.id, "VERIFIED")}
                  className="rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-accent/25"
                >
                  Verified
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
