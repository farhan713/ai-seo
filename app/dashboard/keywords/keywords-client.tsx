"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Source = "AUTO_PROFILE" | "AUTO_GSC" | "AUTO_AUDIT" | "MANUAL";

type Row = {
  id: string;
  phrase: string;
  note: string | null;
  source: Source;
  createdAt: string;
  updatedAt: string;
  gsc: {
    matchedQuery: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  } | null;
};

const SOURCE_LABEL: Record<Source, string> = {
  AUTO_PROFILE: "From profile",
  AUTO_GSC: "From Search Console",
  AUTO_AUDIT: "From audit",
  MANUAL: "Added by you",
};

function sourceBadgeClass(s: Source): string {
  switch (s) {
    case "MANUAL":
      return "bg-slate-100 text-slate-800 ring-slate-200";
    case "AUTO_GSC":
      return "bg-cyan-50 text-cyan-900 ring-cyan-200";
    case "AUTO_AUDIT":
      return "bg-violet-50 text-violet-900 ring-violet-200";
    default:
      return "bg-amber-50 text-amber-950 ring-amber-200";
  }
}

export default function KeywordsClient() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [limit, setLimit] = useState(0);
  const [newPhrase, setNewPhrase] = useState("");
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPhrase, setEditPhrase] = useState("");
  const [editNote, setEditNote] = useState("");

  const load = useCallback(() => {
    setErr(null);
    fetch("/api/tracked-keywords")
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Failed to load");
        setRows(body.keywords ?? []);
        setLimit(body.limit ?? 0);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshSuggestions = () => {
    setErr(null);
    startTransition(() => {
      fetch("/api/tracked-keywords/refresh", { method: "POST" })
        .then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || "Refresh failed");
          }
          load();
          router.refresh();
        })
        .catch((e) => setErr(e instanceof Error ? e.message : "Refresh failed"));
    });
  };

  const addManual = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    fetch("/api/tracked-keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phrase: newPhrase, note: newNote || undefined }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Could not add");
        setNewPhrase("");
        setNewNote("");
        load();
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not add"));
  };

  const saveEdit = (id: string) => {
    setErr(null);
    fetch(`/api/tracked-keywords/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phrase: editPhrase, note: editNote, promoteToManual: true }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Could not save");
        setEditingId(null);
        load();
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not save"));
  };

  const remove = (id: string) => {
    if (!confirm("Remove this keyword?")) return;
    setErr(null);
    fetch(`/api/tracked-keywords/${id}`, { method: "DELETE" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Could not delete");
        }
        load();
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not delete"));
  };

  const exportCsv = () => {
    const headers = ["phrase", "source", "note", "gsc_query", "clicks", "impressions", "ctr_pct", "position"];
    const lines = [
      headers.join(","),
      ...rows.map((r) => {
        const g = r.gsc;
        const ctr = g ? (g.ctr * 100).toFixed(2) : "";
        const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
        return [
          esc(r.phrase),
          r.source,
          esc(r.note ?? ""),
          g ? esc(g.matchedQuery) : "",
          g ? String(g.clicks) : "",
          g ? String(g.impressions) : "",
          ctr,
          g ? g.position.toFixed(2) : "",
        ].join(",");
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "keywords.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const atLimit = limit > 0 && rows.length >= limit;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Keywords & topics</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            We pre-fill terms from your business profile, latest audit content pillars, and Search Console (when
            connected). Edit, delete, or add your own — changes stay yours.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={refreshSuggestions}
            className="rounded-lg border border-slate-200 bg-card px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {pending ? "Refreshing…" : "Refresh suggestions"}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="rounded-lg border border-slate-200 bg-card px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      <p className="text-sm text-muted">
        {limit > 0 ? (
          <>
            Using <strong className="text-slate-800">{rows.length}</strong> of <strong>{limit}</strong> keywords for
            your plan.
          </>
        ) : null}{" "}
        <Link href="/dashboard/search-performance" className="font-medium text-accent hover:underline">
          Search performance
        </Link>{" "}
        shows raw GSC queries; this list is your tracked set with matching stats.
      </p>

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{err}</div>
      ) : null}

      <form onSubmit={addManual} className="rounded-xl border border-slate-200 bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Add keyword</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="text-xs font-medium text-muted">Phrase</label>
            <input
              value={newPhrase}
              onChange={(e) => setNewPhrase(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="e.g. best coffee downtown"
              disabled={atLimit}
            />
          </div>
          <div className="min-w-0 flex-1">
            <label className="text-xs font-medium text-muted">Note (optional)</label>
            <input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Landing page, intent…"
              disabled={atLimit}
            />
          </div>
          <button
            type="submit"
            disabled={atLimit || !newPhrase.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {atLimit ? <p className="mt-2 text-xs text-amber-800">Keyword limit reached for your plan.</p> : null}
      </form>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-card p-8 text-center text-sm text-muted shadow-sm">
          No keywords yet. Save your business profile (target keywords & industry) or run{" "}
          <Link href="/dashboard/audit" className="font-medium text-accent hover:underline">
            Site audit
          </Link>
          , then use <strong>Refresh suggestions</strong>.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-card shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Keyword / topic</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">GSC match</th>
                <th className="px-2 py-3 tabular-nums">Clicks</th>
                <th className="px-2 py-3 tabular-nums">Impr.</th>
                <th className="px-2 py-3 tabular-nums">Pos.</th>
                <th className="px-4 py-3"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 align-top">
                    {editingId === r.id ? (
                      <div className="space-y-2">
                        <input
                          value={editPhrase}
                          onChange={(e) => setEditPhrase(e.target.value)}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                        />
                        <input
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                          placeholder="Note"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-xs font-semibold text-primary hover:underline"
                            onClick={() => saveEdit(r.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="text-xs text-muted hover:underline"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium text-slate-900">{r.phrase}</div>
                        {r.note ? <div className="mt-1 text-xs text-muted">{r.note}</div> : null}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${sourceBadgeClass(r.source)}`}
                    >
                      {SOURCE_LABEL[r.source]}
                    </span>
                  </td>
                  <td className="max-w-[200px] px-3 py-3 align-top text-xs text-muted">
                    {r.gsc ? (
                      <span title={r.gsc.matchedQuery}>{r.gsc.matchedQuery}</span>
                    ) : (
                      <span className="italic">No match in GSC window</span>
                    )}
                  </td>
                  <td className="px-2 py-3 tabular-nums text-muted">{r.gsc?.clicks ?? "—"}</td>
                  <td className="px-2 py-3 tabular-nums text-muted">{r.gsc?.impressions ?? "—"}</td>
                  <td className="px-2 py-3 tabular-nums text-muted">
                    {r.gsc ? r.gsc.position.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    {editingId !== r.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="text-xs font-medium text-accent hover:underline"
                          onClick={() => {
                            setEditingId(r.id);
                            setEditPhrase(r.phrase);
                            setEditNote(r.note ?? "");
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium text-red-700 hover:underline"
                          onClick={() => remove(r.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
