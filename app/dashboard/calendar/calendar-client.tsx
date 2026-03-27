"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  title: string;
  brief: string;
  dueDate: string | null;
  status: string;
  sourceAuditId: string | null;
};

export default function CalendarClient(props: { audits: { id: string; url: string; createdAt: string }[] }) {
  const [items, setItems] = useState<Item[]>([]);
  const [limit, setLimit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [due, setDue] = useState("");
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(() => {
    setErr(null);
    fetch("/api/calendar-items")
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Load failed");
        setItems(body.items || []);
        setLimit(body.limit ?? 0);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = () => {
    setErr(null);
    fetch("/api/calendar-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        brief,
        dueDate: due || undefined,
      }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Could not add");
        setTitle("");
        setBrief("");
        setDue("");
        load();
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not add"));
  };

  const seed = (auditId: string) => {
    setSeeding(true);
    setErr(null);
    fetch("/api/calendar-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seedFromAuditId: auditId }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Seed failed");
        load();
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Seed failed"))
      .finally(() => setSeeding(false));
  };

  const updateStatus = (id: string, status: string) => {
    fetch(`/api/calendar-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).then(() => load());
  };

  const remove = (id: string) => {
    if (!confirm("Remove this item?")) return;
    fetch(`/api/calendar-items/${id}`, { method: "DELETE" }).then(() => load());
  };

  const atLimit = limit > 0 && items.length >= limit;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Content calendar</h1>
        <p className="mt-1 text-sm text-muted">
          Plan posts from your audit content pillars or add your own. Starter: up to {limit || 2} items. Growth/Elite:
          larger capacity.
        </p>
      </div>

      {props.audits.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-800">Add from site audit pillars</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {props.audits.slice(0, 5).map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={seeding || atLimit}
                onClick={() => seed(a.id)}
                className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-900 hover:bg-cyan-100 disabled:opacity-50"
              >
                Seed from audit {new Date(a.createdAt).toLocaleDateString()}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-card p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-800">New item</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            disabled={atLimit}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
          />
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Brief / channel notes"
            disabled={atLimit}
            className="min-h-[72px] rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            disabled={atLimit}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={atLimit || !title.trim()}
            onClick={add}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            Add to calendar
          </button>
        </div>
        {atLimit ? <p className="mt-2 text-xs text-amber-800">Item limit reached for your plan.</p> : null}
      </div>

      {err ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{err}</div> : null}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">No items yet. Seed from an audit or add manually.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-card shadow-sm">
          {items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{i.title}</p>
                {i.brief ? <p className="mt-1 text-sm text-muted">{i.brief}</p> : null}
                <p className="mt-1 text-xs text-muted">
                  {i.dueDate ? `Due ${new Date(i.dueDate).toLocaleDateString()}` : "No due date"} · {i.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={i.status}
                  onChange={(e) => updateStatus(i.id, e.target.value)}
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                >
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="DONE">Done</option>
                  <option value="SKIPPED">Skipped</option>
                </select>
                <button type="button" onClick={() => remove(i.id)} className="text-xs font-medium text-red-700 hover:underline">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm">
        <Link href="/dashboard/audit" className="font-medium text-accent hover:underline">
          Site audit
        </Link>{" "}
        generates pillar ideas you can import here.
      </p>
    </div>
  );
}
