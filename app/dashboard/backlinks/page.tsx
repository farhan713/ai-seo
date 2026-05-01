"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  directoryName: string;
  directoryUrl: string;
  priority: string;
  status: "PENDING" | "SUBMITTED" | "VERIFIED";
};

type SubPayload = { plan: string } | null;

type StatusOption = {
  value: Row["status"];
  label: string;
  active: string;
  idle: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "PENDING",
    label: "Pending",
    active: "bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/30",
    idle: "border-slate-200 text-slate-700 hover:bg-slate-50",
  },
  {
    value: "SUBMITTED",
    label: "Submitted",
    active: "bg-primary text-white border-primary shadow-sm ring-2 ring-primary/30",
    idle: "border-primary/30 text-primary hover:bg-primary/10",
  },
  {
    value: "VERIFIED",
    label: "Verified",
    active: "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/30",
    idle: "border-emerald-300 text-emerald-700 hover:bg-emerald-50",
  },
];

export default function BacklinksPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [sub, setSub] = useState<SubPayload | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function load() {
    const [blRes, subRes] = await Promise.all([fetch("/api/backlinks"), fetch("/api/subscription")]);
    if (blRes.ok) setRows(await blRes.json());
    if (subRes.ok) setSub(await subRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: Row["status"]) {
    setPendingId(id);
    // optimistic update so the highlight is immediate
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await fetch(`/api/backlinks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } finally {
      setPendingId(null);
    }
  }

  async function refreshList() {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await fetch("/api/backlinks/refresh", { method: "POST" });
      if (!res.ok) {
        setRefreshMsg("Could not refresh the directory list.");
        return;
      }
      const j = (await res.json().catch(() => ({}))) as {
        removed?: number;
        added?: number;
        kept?: number;
        source?: "ai" | "fallback";
      };
      const kept = j.kept ?? 0;
      const sourceLabel =
        j.source === "ai"
          ? "Tailored to your website by AI."
          : "Used a generic starter list (add your website under Business profile to get a tailored list).";
      setRefreshMsg(
        `${sourceLabel} ${j.added ?? 0} new directories added.${
          kept > 0 ? ` ${kept} already-submitted/verified entries kept.` : ""
        }`
      );
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted">Loading directories…</div>;
  }

  const starterEmpty = rows.length === 0 && sub?.plan === "STARTER_499";
  const growthEmpty =
    rows.length === 0 && (sub?.plan === "GROWTH_899" || sub?.plan === "ELITE_1599");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Backlink checklist</h1>
          <p className="mt-1 text-sm text-muted">
            Directories tailored to your business by analyzing your website. Tap a status to mark each one. The active
            status stays highlighted.
          </p>
        </div>
        {rows.length > 0 ? (
          <button
            type="button"
            onClick={() => void refreshList()}
            disabled={refreshing}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            title="Re-analyze your website and pick fresh, business-specific directories"
          >
            {refreshing ? "Analyzing…" : "Re-analyze my business"}
          </button>
        ) : null}
      </div>

      {refreshMsg ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          {refreshMsg}
        </p>
      ) : null}

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
            <li
              key={r.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
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
                </div>
              </div>
              <div
                role="radiogroup"
                aria-label={`Status for ${r.directoryName}`}
                className="flex flex-wrap gap-2"
              >
                {STATUS_OPTIONS.map((opt) => {
                  const isActive = r.status === opt.value;
                  const isPending = pendingId === r.id;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      disabled={isPending}
                      onClick={() => void updateStatus(r.id, opt.value)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                        isActive ? opt.active : `bg-white ${opt.idle}`
                      }`}
                    >
                      {opt.label}
                      {isActive ? " ✓" : ""}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
