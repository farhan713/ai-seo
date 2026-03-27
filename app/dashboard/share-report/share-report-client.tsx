"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ShareRow = { id: string; token: string; expiresAt: string; createdAt: string };

export function ShareReportClient({ baseUrl }: { baseUrl: string }) {
  const [rows, setRows] = useState<ShareRow[]>([]);
  const [days, setDays] = useState(14);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/report-shares");
    if (res.ok) {
      const j = (await res.json()) as { shares?: ShareRow[] };
      setRows(Array.isArray(j.shares) ? j.shares : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createLink() {
    setMsg("");
    const res = await fetch("/api/report-shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresInDays: days }),
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string; publicUrl?: string };
    if (!res.ok) {
      setMsg(j.error || "Failed");
      return;
    }
    const url = j.publicUrl || "";
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        setMsg("Created. Link copied to clipboard.");
      } catch {
        setMsg(`Created. Copy this link: ${url}`);
      }
    } else {
      setMsg("Created.");
    }
    await load();
  }

  async function revoke(id: string) {
    await fetch(`/api/report-shares/${id}`, { method: "DELETE" });
    await load();
  }

  if (loading) return <div className="h-24 animate-pulse rounded-xl bg-slate-100" />;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">New share link</h2>
        <p className="mt-1 text-sm text-muted">
          Anyone with the link can view a read-only snapshot (growth score, audit summary, keywords count). No login. Link
          expires automatically.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Expires in (days)</label>
            <input
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(e) => setDays(Number(e.target.value) || 14)}
              className="mt-1 w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => void createLink()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Generate link
          </button>
        </div>
        {msg ? <p className="mt-3 text-sm text-slate-700">{msg}</p> : null}
        <p className="mt-2 text-xs text-muted">Public base URL used: {baseUrl || "(set AUTH_URL in production)"}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Active links</h2>
        <ul className="mt-3 space-y-3">
          {rows.length === 0 ? (
            <li className="text-sm text-muted">No active links.</li>
          ) : (
            rows.map((r) => {
              const url = baseUrl ? `${baseUrl}/r/${r.token}` : `/r/${r.token}`;
              return (
                <li key={r.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                  <div className="break-all font-mono text-xs text-primary">{url}</div>
                  <div className="mt-1 text-xs text-muted">
                    Expires {new Date(r.expiresAt).toLocaleString()} · Created {new Date(r.createdAt).toLocaleString()}
                  </div>
                  <button
                    type="button"
                    onClick={() => void revoke(r.id)}
                    className="mt-2 text-xs font-semibold text-red-700 hover:underline"
                  >
                    Revoke
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <Link href="/dashboard" className="inline-block text-sm font-semibold text-accent hover:underline">
        ← Overview
      </Link>
    </div>
  );
}
