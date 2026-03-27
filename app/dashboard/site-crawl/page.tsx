"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CrawlStats = {
  errors: number;
  warnings: number;
  notices: number;
  healthy: number;
  broken: number;
  redirect: number;
  blocked: number;
};

type RunListItem = {
  id: string;
  baseUrl: string;
  status: string;
  maxPages: number;
  pagesCrawled: number;
  stats: CrawlStats | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  pageRows: number;
};

type CrawlIssue = { id: string; severity: string; title: string; detail: string };

type CrawlPageRow = {
  id: string;
  url: string;
  finalUrl: string | null;
  statusCode: number | null;
  ok: boolean;
  title: string | null;
  metaDescription: string | null;
  h1Count: number;
  issues: CrawlIssue[];
};

type RunDetail = RunListItem & { pages: CrawlPageRow[] };

function StatBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs font-medium text-slate-600">
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SiteCrawlPage() {
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState("");
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [maxPages, setMaxPages] = useState(40);
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");

  const loadRuns = useCallback(async () => {
    const res = await fetch("/api/site-crawl");
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    if (res.ok) {
      setRuns(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  async function runCrawl() {
    setErr("");
    setRunning(true);
    try {
      const res = await fetch("/api/site-crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxPages }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr((j as { error?: string }).error || "Crawl failed");
        return;
      }
      await loadRuns();
      const id = (j as { id?: string }).id;
      if (id) await openDetail(id);
    } catch {
      setErr("Network error");
    } finally {
      setRunning(false);
    }
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/site-crawl/${id}`);
      if (!res.ok) return;
      const raw = (await res.json()) as RunDetail & { pages: (CrawlPageRow & { issues: unknown })[] };
      setDetail({
        ...raw,
        pages: raw.pages.map((p) => ({
          ...p,
          issues: Array.isArray(p.issues) ? (p.issues as CrawlIssue[]) : [],
        })),
      });
    } finally {
      setDetailLoading(false);
    }
  }

  const issueRollup = useMemo(() => {
    if (!detail?.pages) return [];
    const map = new Map<string, { title: string; severity: string; count: number }>();
    for (const p of detail.pages) {
      for (const i of p.issues) {
        const k = `${i.severity}:${i.id}`;
        const prev = map.get(k);
        if (prev) prev.count += 1;
        else map.set(k, { title: i.title, severity: i.severity, count: 1 });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [detail]);

  const compareStats = useMemo(() => {
    const runA = runs.find((r) => r.id === compareA);
    const runB = runs.find((r) => r.id === compareB);
    if (!runA?.stats || !runB?.stats) return null;
    const [earlier, later] =
      new Date(runA.startedAt) <= new Date(runB.startedAt) ? [runA, runB] : [runB, runA];
    const es = earlier.stats as CrawlStats;
    const ls = later.stats as CrawlStats;
    const keys: (keyof CrawlStats)[] = ["errors", "warnings", "notices", "healthy", "broken"];
    return keys.map((k) => ({
      key: k,
      earlier: es[k],
      later: ls[k],
      d: ls[k] - es[k],
    }));
  }, [runs, compareA, compareB]);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  if (forbidden) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Site crawl</h1>
        <p className="mt-2 text-sm text-muted">Included with Starter and above.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-accent hover:underline">
          ← Overview
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-16">
      <header className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-700">Multi-page · Option B</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Site crawl</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Discovers URLs from your <strong className="text-slate-800">sitemap</strong> (plus your homepage), fetches each
          page, and records <strong className="text-slate-800">errors, warnings, and notices</strong> you can track over
          time. This is the path toward a SEMrush-style crawl product. Re-run after deploys to compare runs.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">New crawl</h2>
        <p className="mt-1 text-xs text-muted">
          Uses your profile website URL. Max pages cap protects runtime (raise later on Pro).
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="block text-xs font-medium text-slate-600">Max URLs</span>
            <input
              type="number"
              min={5}
              max={80}
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              className="mt-1 w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={running}
            onClick={() => void runCrawl()}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50"
          >
            {running ? "Crawling…" : "Run crawl now"}
          </button>
        </div>
        {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6">
        <h2 className="text-sm font-bold text-slate-900">Compare two runs</h2>
        <p className="mt-1 text-xs text-muted">Pick two completed crawls to see how error and warning counts moved.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <select
            value={compareA}
            onChange={(e) => setCompareA(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Earlier run…</option>
            {runs
              .filter((r) => r.status === "COMPLETE")
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {new Date(r.startedAt).toLocaleString()} · {r.pagesCrawled} pages
                </option>
              ))}
          </select>
          <select
            value={compareB}
            onChange={(e) => setCompareB(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Later run…</option>
            {runs
              .filter((r) => r.status === "COMPLETE")
              .map((r) => (
                <option key={`b-${r.id}`} value={r.id}>
                  {new Date(r.startedAt).toLocaleString()} · {r.pagesCrawled} pages
                </option>
              ))}
          </select>
        </div>
        {compareStats ? (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-muted">
                <th className="py-2">Metric</th>
                <th className="py-2">Earlier crawl</th>
                <th className="py-2">Later crawl</th>
                <th className="py-2">Change</th>
              </tr>
            </thead>
            <tbody>
              {compareStats.map((row) => {
                const badUp =
                  (row.key === "errors" || row.key === "warnings" || row.key === "broken") && row.d > 0;
                const goodDown =
                  (row.key === "errors" || row.key === "warnings" || row.key === "broken") && row.d < 0;
                const healthyUp = row.key === "healthy" && row.d > 0;
                return (
                  <tr key={row.key} className="border-b border-slate-100">
                    <td className="py-2 font-medium capitalize">{row.key}</td>
                    <td className="py-2 tabular-nums">{row.earlier}</td>
                    <td className="py-2 tabular-nums">{row.later}</td>
                    <td
                      className={`py-2 tabular-nums font-semibold ${
                        badUp ? "text-red-600" : goodDown || healthyUp ? "text-emerald-700" : "text-slate-600"
                      }`}
                    >
                      {row.d > 0 ? `+${row.d}` : row.d}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </section>

      <section>
        <h2 className="text-sm font-bold text-slate-900">History</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pages</th>
                <th className="px-4 py-3">Errors</th>
                <th className="px-4 py-3">Warnings</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    No crawls yet. Run your first crawl above.
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-xs text-muted">{new Date(r.startedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium">{r.status}</td>
                    <td className="px-4 py-3 tabular-nums">{r.pagesCrawled}</td>
                    <td className="px-4 py-3 tabular-nums text-red-700">{(r.stats as CrawlStats | null)?.errors ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-amber-800">{(r.stats as CrawlStats | null)?.warnings ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void openDetail(r.id)}
                        className="text-xs font-bold text-accent hover:underline"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {detailLoading ? <p className="text-sm text-muted">Loading crawl detail…</p> : null}

      {detail ? (
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Crawl overview</h2>
            <p className="mt-1 break-all text-sm text-primary">{detail.baseUrl}</p>
            <p className="mt-1 text-xs text-muted">
              Status {detail.status} · {detail.pagesCrawled} URLs · cap {detail.maxPages}
            </p>
            {detail.errorMessage ? <p className="mt-2 text-sm text-red-600">{detail.errorMessage}</p> : null}
            {detail.stats ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <StatBar
                  label="Healthy pages (no error-level issues)"
                  value={detail.stats.healthy}
                  total={detail.pagesCrawled || 1}
                  color="bg-emerald-500"
                />
                <StatBar label="Broken (4xx/5xx)" value={detail.stats.broken} total={detail.pagesCrawled || 1} color="bg-red-500" />
                <StatBar label="Redirects" value={detail.stats.redirect} total={detail.pagesCrawled || 1} color="bg-blue-500" />
                <StatBar label="Blocked (401/403)" value={detail.stats.blocked} total={detail.pagesCrawled || 1} color="bg-slate-500" />
              </div>
            ) : null}
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-red-50 py-4">
                <p className="text-2xl font-black text-red-800">{detail.stats?.errors ?? 0}</p>
                <p className="text-[10px] font-bold uppercase text-red-700">Issue errors</p>
              </div>
              <div className="rounded-xl bg-amber-50 py-4">
                <p className="text-2xl font-black text-amber-950">{detail.stats?.warnings ?? 0}</p>
                <p className="text-[10px] font-bold uppercase text-amber-900">Warnings</p>
              </div>
              <div className="rounded-xl bg-slate-100 py-4">
                <p className="text-2xl font-black text-slate-800">{detail.stats?.notices ?? 0}</p>
                <p className="text-[10px] font-bold uppercase text-slate-600">Notices</p>
              </div>
            </div>
          </div>

          {issueRollup.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">Issues across site</h3>
              <p className="mt-1 text-xs text-muted">Grouped by rule. SEMrush-style rollups come next (export, how-to-fix links).</p>
              <ul className="mt-4 space-y-2">
                {issueRollup.map((x, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm"
                  >
                    <span>
                      <span
                        className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          x.severity === "error"
                            ? "bg-red-200 text-red-900"
                            : x.severity === "warning"
                              ? "bg-amber-200 text-amber-950"
                              : "bg-slate-200 text-slate-800"
                        }`}
                      >
                        {x.severity}
                      </span>
                      {x.title}
                    </span>
                    <span className="font-bold tabular-nums text-slate-900">{x.count} pages</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">Crawled pages</h3>
            <ul className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto">
              {detail.pages.map((p) => (
                <li key={p.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm">
                  <p className="break-all font-mono text-xs text-primary">{p.url}</p>
                  <p className="mt-1 text-xs text-muted">
                    HTTP {p.statusCode ?? "?"} · H1 {p.h1Count} · {p.issues.length} issue(s)
                  </p>
                  {p.title ? <p className="mt-2 font-medium text-slate-800">{p.title}</p> : null}
                  {p.issues.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs text-slate-600">
                      {p.issues.map((i) => (
                        <li key={i.id + i.title}>
                          <strong className="text-slate-800">{i.title}:</strong> {i.detail}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-4 text-sm font-semibold">
        <Link href="/dashboard/audit" className="text-accent hover:underline">
          AI site audit →
        </Link>
        <Link href="/dashboard" className="text-accent hover:underline">
          ← Overview
        </Link>
      </div>
    </div>
  );
}
