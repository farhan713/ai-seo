"use client";

import { useCallback, useEffect, useState } from "react";

type Snap = {
  fetchedAt: string;
  title?: string;
  metaDescription?: string;
  h1Count: number;
  statusCode?: number;
  fetchError?: string;
  ok?: boolean;
};

type Row = {
  id: string;
  url: string;
  label: string | null;
  snapshot: unknown;
  priorSnapshot: unknown;
  updatedAt: string;
};

function parseSnap(raw: unknown): Snap | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.fetchedAt !== "string") return null;
  return {
    fetchedAt: o.fetchedAt,
    title: typeof o.title === "string" ? o.title : undefined,
    metaDescription: typeof o.metaDescription === "string" ? o.metaDescription : undefined,
    h1Count: typeof o.h1Count === "number" ? o.h1Count : 0,
    statusCode: typeof o.statusCode === "number" ? o.statusCode : undefined,
    fetchError: typeof o.fetchError === "string" ? o.fetchError : undefined,
    ok: o.ok === true,
  };
}

function DiffLine({ label, before, after }: { label: string; before: string; after: string }) {
  const changed = before !== after;
  return (
    <div className={`rounded-lg px-3 py-2 text-sm ${changed ? "bg-amber-50 ring-1 ring-amber-200" : "bg-slate-50"}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      {changed ? (
        <p className="mt-1 text-slate-800">
          <span className="text-red-700 line-through">{before || "—"}</span>
          <span className="mx-2 text-muted">→</span>
          <span className="font-medium text-emerald-800">{after || "—"}</span>
        </p>
      ) : (
        <p className="mt-1 text-slate-700">{after || before || "—"}</p>
      )}
    </div>
  );
}

export function CompetitorsClient({ limit }: { limit: number }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [cap, setCap] = useState(limit);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr("");
    const res = await fetch("/api/competitors");
    if (!res.ok) {
      setErr("Could not load competitors.");
      setLoading(false);
      return;
    }
    const j = (await res.json()) as { competitors?: Row[]; limit?: number };
    setRows(Array.isArray(j.competitors) ? j.competitors : []);
    if (typeof j.limit === "number") setCap(j.limit);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), label: label.trim() || undefined }),
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setErr(j.error || "Add failed");
      return;
    }
    setUrl("");
    setLabel("");
    await load();
  }

  async function refresh(id: string) {
    setBusyId(id);
    setErr("");
    try {
      const res = await fetch(`/api/competitors/${id}/refresh`, { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Refresh failed");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this competitor?")) return;
    setErr("");
    const res = await fetch(`/api/competitors/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error || "Delete failed");
      return;
    }
    await load();
  }

  if (loading) {
    return <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />;
  }

  return (
    <div className="space-y-8">
      {err ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <form onSubmit={add} className="rounded-2xl border border-slate-200 bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Add competitor URL</p>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://competitor.com"
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Optional label"
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={rows.length >= cap}
          className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {rows.length >= cap ? `Limit reached (${cap})` : "Save URL"}
        </button>
      </form>

      <ul className="space-y-6">
        {rows.map((r) => {
          const cur = parseSnap(r.snapshot);
          const prev = parseSnap(r.priorSnapshot);
          return (
            <li key={r.id} className="rounded-2xl border border-slate-200 bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-all text-sm font-semibold text-primary">{r.url}</p>
                  {r.label ? <p className="text-xs text-muted">{r.label}</p> : null}
                  {cur?.fetchedAt ? (
                    <p className="mt-1 text-[11px] text-muted">Last snapshot: {new Date(cur.fetchedAt).toLocaleString()}</p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-800">No snapshot yet — run Refresh to fetch the homepage.</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void refresh(r.id)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {busyId === r.id ? "Fetching…" : "Refresh snapshot"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(r.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {cur?.fetchError ? (
                <p className="mt-3 text-sm text-red-800">Fetch error: {cur.fetchError}</p>
              ) : null}

              {cur && prev ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-1">
                  <DiffLine label="Title" before={prev.title ?? ""} after={cur.title ?? ""} />
                  <DiffLine label="Meta description" before={prev.metaDescription ?? ""} after={cur.metaDescription ?? ""} />
                  <DiffLine label="H1 count" before={String(prev.h1Count)} after={String(cur.h1Count)} />
                </div>
              ) : cur ? (
                <div className="mt-4 space-y-1 text-sm text-slate-700">
                  <p>
                    <span className="font-medium">Title:</span> {cur.title || "—"}
                  </p>
                  <p>
                    <span className="font-medium">Meta:</span> {cur.metaDescription || "—"}
                  </p>
                  <p>
                    <span className="font-medium">H1 count:</span> {cur.h1Count}
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">No competitors yet. Add a homepage URL to start a lightweight watch.</p>
      ) : null}
    </div>
  );
}
