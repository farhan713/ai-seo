"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Task = { id: string; label: string; category: string; done: boolean };

export default function OnPageChecklistClient({ defaultUrl }: { defaultUrl: string }) {
  const [url, setUrl] = useState(defaultUrl);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [persisted, setPersisted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!url.trim()) return;
    setLoading(true);
    setErr(null);
    const q = encodeURIComponent(url.trim());
    fetch(`/api/on-page-checklist?url=${q}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Failed");
        setTasks(body.tasks || []);
        setPersisted(!!body.persisted);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [url]);

  useEffect(() => {
    if (!url.trim()) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load for default URL only
  }, []);

  const toggle = (taskId: string, done: boolean) => {
    setErr(null);
    fetch("/api/on-page-checklist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), taskId, done }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Failed");
        setTasks(body.tasks || []);
        setPersisted(true);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
  };

  const saveInitial = () => {
    setErr(null);
    fetch("/api/on-page-checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), reset: true }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Failed");
        setTasks(body.tasks || []);
        setPersisted(true);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">On-page checklist</h1>
        <p className="mt-1 text-sm text-muted">
          Track fixes per URL. Tasks are suggested from defaults and your latest audit findings. Progress is saved per
          URL.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[240px] flex-1">
          <label className="text-xs font-medium text-muted">Page URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="https://yoursite.com/page"
          />
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-lg border border-slate-200 bg-card px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
        >
          Load
        </button>
        <button
          type="button"
          onClick={saveInitial}
          disabled={!url.trim()}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
        >
          Save checklist
        </button>
      </div>

      {err ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{err}</div> : null}

      {loading ? <p className="text-sm text-muted">Loading…</p> : null}

      {!loading && tasks.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-card shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-medium text-slate-800">
              {persisted ? "Saved checklist" : "Preview (save to persist)"}
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={(e) => toggle(t.id, e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted">{t.category}</span>
                  <p className="text-sm text-slate-800">{t.label}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-sm">
        <Link href="/dashboard/audit" className="font-medium text-accent hover:underline">
          Run Site audit
        </Link>{" "}
        for richer suggestions.
      </p>
    </div>
  );
}
