"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import Link from "next/link";

type Conn = {
  siteUrl: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  periodStart: string | null;
  periodEnd: string | null;
} | null;

type QueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

const GSC_ERRORS: Record<string, string> = {
  missing_oauth_env: "Search Console OAuth is not configured (set client ID and secret).",
  invalid_state: "OAuth session expired. Try connecting again.",
  token_exchange: "Could not complete Google sign-in.",
  no_refresh_token: "Google did not return a refresh token. Revoke app access in Google Account and connect again with consent.",
  list_sites: "Could not list Search Console properties.",
  no_property: "No property matched your business URL. Add the site in Search Console or update your business URL.",
};

function FlashFromUrl() {
  const sp = useSearchParams();
  const err = sp.get("gsc_error");
  const ok = sp.get("gsc");
  if (ok === "connected") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
        Search Console connected and data synced.
      </div>
    );
  }
  if (err && GSC_ERRORS[err]) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{GSC_ERRORS[err]}</div>
    );
  }
  if (err) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
        Something went wrong ({err}).
      </div>
    );
  }
  return null;
}

export default function SearchPerformanceClient(props: {
  oauthConfigured: boolean;
  oauthCallbackUrl: string;
  connection: Conn;
  queries: QueryRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  const onSync = () => {
    setActionError(null);
    fetch("/api/integrations/search-console", { method: "POST" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Sync failed");
        refresh();
      })
      .catch((e) => setActionError(e instanceof Error ? e.message : "Sync failed"));
  };

  const onDisconnect = () => {
    if (!confirm("Disconnect Search Console and remove stored query data for this account?")) return;
    setActionError(null);
    fetch("/api/integrations/search-console", { method: "DELETE" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Disconnect failed");
        }
        refresh();
      })
      .catch((e) => setActionError(e instanceof Error ? e.message : "Disconnect failed"));
  };

  const { oauthConfigured, oauthCallbackUrl, connection, queries } = props;
  const connected = !!connection?.siteUrl;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Search performance</h1>
        <p className="mt-1 text-sm text-muted">
          Connect Google Search Console to import the last 28 days of search queries (read-only). Data refreshes on sync;
          no manual keyword entry required.
        </p>
      </div>

      <FlashFromUrl />

      {actionError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{actionError}</div>
      ) : null}

      {!oauthConfigured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <strong>Not configured.</strong> Add <code className="rounded bg-white/80 px-1">GOOGLE_SEARCH_CONSOLE_CLIENT_ID</code>{" "}
          and <code className="rounded bg-white/80 px-1">GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET</code> to the server
          environment. OAuth redirect URI in Google Cloud must match:{" "}
          <code className="break-all rounded bg-white/80 px-1">{oauthCallbackUrl}</code>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {!connected ? (
          <a
            href="/api/integrations/search-console/authorize"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95"
          >
            Connect Google Search Console
          </a>
        ) : (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={onSync}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-card px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {pending ? "Working…" : "Sync now"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onDisconnect}
              className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
            >
              Disconnect
            </button>
          </>
        )}
        <Link href="/dashboard/settings" className="text-sm font-medium text-accent hover:underline">
          Business profile (site URL)
        </Link>
        <Link href="/dashboard/keywords" className="text-sm font-medium text-accent hover:underline">
          Keywords & topics
        </Link>
      </div>

      {connected && connection ? (
        <div className="rounded-xl border border-slate-200 bg-card p-4 text-sm shadow-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <span className="text-muted">Property</span>
              <div className="font-mono text-xs text-slate-800 break-all">{connection.siteUrl}</div>
            </div>
            <div>
              <span className="text-muted">Last sync</span>
              <div className="text-slate-800">
                {connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString() : "—"}
              </div>
            </div>
            <div>
              <span className="text-muted">Window</span>
              <div className="text-slate-800">
                {connection.periodStart && connection.periodEnd
                  ? `${new Date(connection.periodStart).toLocaleDateString()} – ${new Date(connection.periodEnd).toLocaleDateString()}`
                  : "—"}
              </div>
            </div>
          </div>
          {connection.lastSyncError ? (
            <p className="mt-3 rounded-md border border-red-100 bg-red-50/80 px-2 py-1.5 text-xs text-red-900">
              {connection.lastSyncError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-card shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Top queries</h2>
          <p className="mt-1 text-xs text-muted">Up to 100 rows, sorted by clicks (last synced window).</p>
        </div>
        <div className="overflow-x-auto">
          {queries.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">
              {connected ? "No query rows yet. Run Sync now or check property has search data." : "Connect Search Console to load queries."}
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-muted">
                  <th className="px-5 py-2">Query</th>
                  <th className="px-3 py-2 tabular-nums">Clicks</th>
                  <th className="px-3 py-2 tabular-nums">Impr.</th>
                  <th className="px-3 py-2 tabular-nums">CTR</th>
                  <th className="px-5 py-2 tabular-nums">Pos.</th>
                </tr>
              </thead>
              <tbody>
                {queries.map((q, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="max-w-[280px] truncate px-5 py-2 text-slate-800" title={q.query}>
                      {q.query}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted">{q.clicks}</td>
                    <td className="px-3 py-2 tabular-nums text-muted">{q.impressions}</td>
                    <td className="px-3 py-2 tabular-nums text-muted">{(q.ctr * 100).toFixed(1)}%</td>
                    <td className="px-5 py-2 tabular-nums text-muted">{q.position.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
