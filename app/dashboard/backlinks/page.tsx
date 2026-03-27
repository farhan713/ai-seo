"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  directoryName: string;
  directoryUrl: string;
  priority: string;
  status: string;
};

type SubPayload = { plan: string } | null;

export default function BacklinksPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [sub, setSub] = useState<SubPayload | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [blRes, subRes] = await Promise.all([fetch("/api/backlinks"), fetch("/api/subscription")]);
    if (blRes.ok) setRows(await blRes.json());
    if (subRes.ok) setSub(await subRes.json());
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

  const starterEmpty = rows.length === 0 && sub?.plan === "STARTER_499";
  const growthEmpty =
    rows.length === 0 && (sub?.plan === "GROWTH_899" || sub?.plan === "ELITE_1599");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Backlink checklist</h1>
        <p className="mt-1 text-sm text-muted">
          Claim and update your business on these directories. Mark each when submitted or verified.
        </p>
      </div>

      {starterEmpty ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          The directory checklist is part of Growth (₹899/mo) and Elite (₹1,599/mo). Your current plan focuses on site
          audits. Upgrade in your account settings or ask your admin to change your subscription.
        </p>
      ) : null}

      {growthEmpty ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          No tasks loaded yet. Refresh the page in a moment. If this persists, contact support so we can seed your
          weekly batch of 10 directories.
        </p>
      ) : null}

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
