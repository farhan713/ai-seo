"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FieldTooltip } from "@/components/field-tooltip";
import type { Ga4SummaryPayload } from "@/lib/ga4-google";

type Conn = {
  propertyId: string | null;
  propertyDisplayName: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  summaryJson: unknown;
};

export function AnalyticsClient({
  allowed,
  oauthConfigured,
}: {
  allowed: boolean;
  oauthConfigured: boolean;
}) {
  const [oauth, setOauth] = useState(oauthConfigured);
  const [conn, setConn] = useState<Conn | null | undefined>(undefined);
  const [propertyId, setPropertyId] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [msg, setMsg] = useState("");
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) return;
    const res = await fetch("/api/integrations/ga4");
    if (!res.ok) {
      setConn(null);
      return;
    }
    const j = (await res.json()) as { oauthConfigured?: boolean; connection: Conn | null };
    if (typeof j.oauthConfigured === "boolean") setOauth(j.oauthConfigured);
    setConn(j.connection);
    if (j.connection?.propertyId) setPropertyId(j.connection.propertyId);
    if (j.connection?.propertyDisplayName) setPropertyName(j.connection.propertyDisplayName);
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveProperty(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/integrations/ga4", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId: propertyId.replace(/\D/g, ""),
        propertyDisplayName: propertyName.trim() || null,
      }),
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMsg(j.error || "Save failed");
      return;
    }
    setMsg("Property saved. Use Sync to pull numbers.");
    await load();
  }

  async function sync() {
    setSyncing(true);
    setMsg("");
    try {
      const res = await fetch("/api/integrations/ga4/sync", { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Sync failed");
      await load();
      setMsg("Synced.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    if (!confirm("Disconnect Google Analytics for this account?")) return;
    await fetch("/api/integrations/ga4", { method: "DELETE" });
    setConn(null);
    setPropertyId("");
    setPropertyName("");
    setMsg("Disconnected.");
  }

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-card p-6 text-sm text-muted">
        Web analytics (GA4) is included on <strong className="text-slate-800">Growth</strong> and{" "}
        <strong className="text-slate-800">Elite</strong>. Upgrade your plan to connect Google Analytics.
      </div>
    );
  }

  const summary = (conn?.summaryJson ?? null) as Ga4SummaryPayload | null;

  return (
    <div className="space-y-6">
      {!oauth ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>Not configured on server.</strong> Add the same Google OAuth client as Search Console and authorize this
          redirect URI in Google Cloud:{" "}
          <code className="rounded bg-white px-1 text-xs">/api/integrations/ga4/callback</code> — plus scope{" "}
          <code className="rounded bg-white px-1 text-xs">analytics.readonly</code>.
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Connect Google Analytics 4</h2>
        <p className="mt-1 text-sm text-muted">
          Uses Google OAuth (read-only). You will paste your numeric <strong>Property ID</strong> after connecting.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="/api/integrations/ga4/authorize"
            className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
          >
            Connect Google
          </a>
          {conn ? (
            <button
              type="button"
              onClick={() => void disconnect()}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Disconnect
            </button>
          ) : null}
        </div>
      </div>

      {conn ? (
        <form onSubmit={saveProperty} className="rounded-2xl border border-slate-200 bg-card p-5 shadow-sm">
          <label className="flex items-center gap-1 text-sm font-medium text-slate-700">
            GA4 Property ID (numeric)
            <FieldTooltip
              label="Find your GA4 Property ID"
              steps={[
                "Open Google Analytics and select your GA4 property.",
                "Click Admin (gear) → Property settings.",
                "Copy the Property ID (digits only, top of the property column).",
                "Paste it here, then Save and Sync.",
              ]}
            />
          </label>
          <input
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="e.g. 123456789"
            className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
          />
          <label className="mt-4 block text-sm font-medium text-slate-700">Display name (optional)</label>
          <input
            value={propertyName}
            onChange={(e) => setPropertyName(e.target.value)}
            placeholder="My main website"
            className="mt-1 w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Save property
            </button>
            <button
              type="button"
              disabled={syncing || !propertyId.trim()}
              onClick={() => void sync()}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              {syncing ? "Syncing…" : "Sync now"}
            </button>
          </div>
        </form>
      ) : null}

      {msg ? <p className="text-sm text-slate-700">{msg}</p> : null}

      {conn?.lastSyncError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{conn.lastSyncError}</p>
      ) : null}

      {summary && !summary.error ? (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-5">
          <p className="text-xs font-bold uppercase text-teal-900">Last sync</p>
          <p className="text-xs text-muted">{summary.syncedAt ? new Date(summary.syncedAt).toLocaleString() : ""}</p>
          <p className="mt-2 text-sm text-slate-700">{summary.dateRangeLabel}</p>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">Sessions</dt>
              <dd className="text-lg font-semibold tabular-nums">{summary.sessions ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Active users</dt>
              <dd className="text-lg font-semibold tabular-nums">{summary.activeUsers ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Page views</dt>
              <dd className="text-lg font-semibold tabular-nums">{summary.screenPageViews ?? "—"}</dd>
            </div>
          </dl>
          {summary.topPages?.length ? (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase text-teal-900">Top pages (views)</p>
              <ul className="mt-2 divide-y divide-teal-200/60 text-sm">
                {summary.topPages.map((p, i) => (
                  <li key={i} className="flex justify-between gap-2 py-2">
                    <span className="truncate font-mono text-xs text-slate-800">{p.pagePath}</span>
                    <span className="shrink-0 tabular-nums text-slate-600">{p.views}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <Link href="/dashboard" className="inline-block text-sm font-semibold text-accent hover:underline">
        ← Overview
      </Link>
    </div>
  );
}
