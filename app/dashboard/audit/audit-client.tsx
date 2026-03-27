"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import type { SiteAudit } from "@prisma/client";
import type { AuditDeliverables } from "@/lib/site-audit";
import { clampDeliverables } from "@/lib/site-audit";
import type { AuditPageSnapshot } from "@/lib/audit-snapshot";
import { isLighthouseDualBundle, isLighthouseSnapshot } from "@/lib/pagespeed-lighthouse";
import { buildAuditProgressCompare } from "@/lib/audit-before-after";
import { buildSocialProofLines } from "@/lib/social-proof-kit";

type Finding = { area: string; severity: string; detail: string; suggestion: string };

type Row = {
  id: string;
  url: string;
  summary: string;
  findings: Finding[];
  lighthouse?: unknown;
  deliverables?: unknown;
  pageSnapshot?: unknown;
  createdAt: string;
};

function severityOrder(sev: string): number {
  const u = sev.toUpperCase();
  if (u.includes("CRITICAL") || u.includes("HIGH")) return 0;
  if (u.includes("MEDIUM") || u.includes("MODERATE")) return 1;
  return 2;
}

function sortedFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));
}

function severityStyles(sev: string): { bar: string; badge: string } {
  const u = sev.toUpperCase();
  if (u.includes("CRITICAL") || u.includes("HIGH")) {
    return { bar: "bg-red-500", badge: "bg-red-100 text-red-900 ring-red-200" };
  }
  if (u.includes("MEDIUM") || u.includes("MODERATE")) {
    return { bar: "bg-amber-500", badge: "bg-amber-100 text-amber-950 ring-amber-200" };
  }
  return { bar: "bg-slate-400", badge: "bg-slate-100 text-slate-800 ring-slate-200" };
}

function parseDeliverables(raw: unknown): AuditDeliverables | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.opportunityIndex !== "number") return null;
  return clampDeliverables(d as Partial<AuditDeliverables>);
}

function hasLocalSeoDeliverables(d: AuditDeliverables): boolean {
  const p = d.localSeoPack;
  return !!(
    p?.gbpPostIdeas?.length ||
    p?.qaSuggestions?.length ||
    p?.napChecklist?.length ||
    p?.reviewResponseSnippets?.length
  );
}

function hasAdCreativeDeliverables(d: AuditDeliverables): boolean {
  const a = d.adCreativeAngles;
  return !!(
    a?.meta?.headlines?.length ||
    a?.meta?.primaryTexts?.length ||
    a?.meta?.descriptions?.length ||
    a?.google?.headlines?.length ||
    a?.google?.descriptions?.length
  );
}

function parsePageSnapshot(raw: unknown): AuditPageSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as AuditPageSnapshot;
  if (!o.primary || typeof o.primary !== "object") return null;
  return o;
}

function textLen(s: string | undefined) {
  return (s ?? "").trim().length;
}

/** Side-by-side meters: same metric for your page vs competitor (0 = missing bar). */
function CompareMeters({
  label,
  yours,
  theirs,
  suffix = "",
}: {
  label: string;
  yours: number;
  theirs: number;
  suffix?: string;
}) {
  const max = Math.max(yours, theirs, 1, 60);
  const wYou = Math.min(100, (yours / max) * 100);
  const wThem = Math.min(100, (theirs / max) * 100);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex justify-between text-[11px] font-medium text-cyan-800">
            <span>Your page</span>
            <span className="tabular-nums text-slate-700">
              {yours}
              {suffix}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/90">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all"
              style={{ width: `${wYou}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[11px] font-medium text-violet-800">
            <span>Competitor</span>
            <span className="tabular-nums text-slate-700">
              {theirs}
              {suffix}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/90">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
              style={{ width: `${wThem}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparisonSnapshotPanel({ snap }: { snap: AuditPageSnapshot }) {
  const c = snap.competitor;
  const hasCompetitor = !!(c && c.url);
  const pTitle = textLen(snap.primary.title);
  const pMeta = textLen(snap.primary.metaDescription);
  const cTitle = hasCompetitor ? textLen(c?.title) : 0;
  const cMeta = hasCompetitor ? textLen(c?.metaDescription) : 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-50 via-white to-cyan-50/30 px-5 py-6 shadow-sm sm:px-8 sm:py-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, rgb(6 182 212 / 0.12), transparent 45%),
            radial-gradient(circle at 80% 60%, rgb(139 92 246 / 0.1), transparent 40%)`,
        }}
      />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-cyan-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            Head-to-head
          </span>
          <span className="text-xs text-slate-600">Live HTML we fetched at audit time</span>
        </div>
        <h3 className="mt-3 text-lg font-bold tracking-tight text-slate-900">On-page signals vs competitor</h3>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
          Findings, scores, and the SEO pack below still describe <strong className="text-slate-800">your site</strong>. This
          block only contrasts public HTML signals so you can see positioning at a glance.
        </p>

        {!hasCompetitor ? (
          <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-6 text-center text-sm text-slate-600">
            Add a <strong className="text-slate-800">competitor URL</strong> on the next run to unlock bars and the gap
            narrative beside your page.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            <CompareMeters label="Title length (characters)" yours={pTitle} theirs={cTitle} />
            <CompareMeters label="Meta description length" yours={pMeta} theirs={cMeta} />
            <CompareMeters label="H1 tags on page" yours={snap.primary.h1Count} theirs={c?.h1Count ?? 0} suffix=" H1" />

            <div className="grid gap-3 border-t border-slate-200/80 pt-6 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-slate-200/80">
                <span className="text-xs font-medium text-slate-600">Canonical tag</span>
                <span className="text-right text-xs font-semibold text-slate-900">
                  <span className="text-cyan-700">You:</span> {snap.primary.canonicalHref ? "Yes" : "—"}
                  <span className="mx-1.5 text-slate-300">|</span>
                  <span className="text-violet-700">Them:</span> {c?.canonicalHref ? "Yes" : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-slate-200/80">
                <span className="text-xs font-medium text-slate-600">Open Graph title</span>
                <span className="text-right text-xs font-semibold text-slate-900">
                  <span className="text-cyan-700">You:</span> {snap.primary.ogTitle ? "Set" : "—"}
                  <span className="mx-1.5 text-slate-300">|</span>
                  <span className="text-violet-700">Them:</span> {c?.ogTitle ? "Set" : "—"}
                </span>
              </div>
            </div>

            <div className="grid gap-4 border-t border-slate-200/80 pt-6 sm:grid-cols-2">
              <div className="rounded-2xl border-l-4 border-cyan-500 bg-cyan-50/40 px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-900">Your page · title & description</p>
                <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">{snap.primary.title || "—"}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{snap.primary.metaDescription || "—"}</p>
                <p className="mt-2 text-[11px] text-slate-500">HTTP {snap.primary.statusCode ?? "?"}</p>
              </div>
              {hasCompetitor ? (
                <div className="rounded-2xl border-l-4 border-violet-500 bg-violet-50/40 px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-violet-900">Competitor · title & description</p>
                  <p className="mt-1 break-all text-[10px] text-slate-500">{c?.url}</p>
                  <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">{c?.title || "—"}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{c?.metaDescription || "—"}</p>
                  <p className="mt-2 text-[11px] text-slate-500">HTTP {c?.statusCode ?? "?"}</p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Scores for delta + summaries. Prefer mobile for run-over-run consistency. */
function lighthouseScores(data: unknown, strategy: "mobile" | "desktop" = "mobile"): Record<string, number | null> | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (isLighthouseDualBundle(data)) {
    const branch = strategy === "desktop" ? data.desktop : data.mobile;
    if (!isLighthouseSnapshot(branch)) return null;
    return branch.scores;
  }
  if (typeof o.error === "string") return null;
  const scores = o.scores as Record<string, number | null> | undefined;
  return scores && typeof scores === "object" ? scores : null;
}

function gaugeStrokeColor(v: number | null): string {
  if (v == null) return "#94a3b8";
  if (v >= 90) return "#0cce6b";
  if (v >= 50) return "#e37300";
  return "#f74545";
}

/** Lighthouse-style circular score (SVG ring). */
function ScoreGauge({ label, value }: { label: string; value: number | null }) {
  const R = 40;
  const C = 2 * Math.PI * R;
  const pct = value == null ? 0 : Math.min(100, Math.max(0, value));
  const arc = (pct / 100) * C;
  const stroke = gaugeStrokeColor(value);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[6.75rem] w-[6.75rem] sm:h-[7.25rem] sm:w-[7.25rem]">
        <svg viewBox="0 0 104 104" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="52" cy="52" r={R} fill="none" stroke="rgb(226 232 240)" strokeWidth="9" />
          <circle
            cx="52"
            cy="52"
            r={R}
            fill="none"
            stroke={stroke}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${C}`}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-black tabular-nums text-slate-900">{value != null ? value : "—"}</span>
        </div>
      </div>
      <span className="max-w-[5.5rem] text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-600">
        {label}
      </span>
    </div>
  );
}

function LighthouseErrorPanel({
  err,
  psiWebUrl,
  title = "Lab measurement (PageSpeed)",
}: {
  err: string;
  psiWebUrl: string;
  title?: string;
}) {
  const needsApiKey =
    err.includes("PAGESPEED_INSIGHTS_API_KEY") || /need.*api key|missing.*key|invalid.*key/i.test(err);
  const loadHung =
    err.toUpperCase().includes("PAGE_HUNG") ||
    err.toUpperCase().includes("PAGE HUNG") ||
    err.toUpperCase().includes("DEVTOOLSTIMEOUT") ||
    err.toUpperCase().includes("PROTOCOL_TIMEOUT");
  return (
    <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-orange-50/50 px-4 py-4 sm:px-5">
      <p className="text-sm font-semibold text-amber-950">{title}</p>
      <p className="mt-2 font-mono text-xs leading-relaxed text-amber-900/90">{err}</p>
      {needsApiKey ? (
        <p className="mt-3 text-xs text-amber-900/85">
          Add <code className="rounded-md bg-white/90 px-1.5 py-0.5 font-mono text-[11px]">PAGESPEED_INSIGHTS_API_KEY</code>{" "}
          on the server.
        </p>
      ) : loadHung ? (
        <p className="mt-3 text-xs leading-relaxed text-amber-900/85">
          Google&apos;s lab could not finish loading this URL. Try again or open the full PSI report.
        </p>
      ) : (
        <p className="mt-3 text-xs text-amber-900/85">Try again later or open PageSpeed in a new tab.</p>
      )}
      {psiWebUrl ? (
        <a
          href={psiWebUrl}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-950"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open PageSpeed report ↗
        </a>
      ) : null}
    </div>
  );
}

function LighthouseBlock({ data }: { data: unknown }) {
  const [tab, setTab] = useState<"mobile" | "desktop">("mobile");

  if (data == null) return null;
  if (typeof data !== "object") return null;

  const items: { label: string; key: "performance" | "seo" | "accessibility" | "bestPractices" }[] = [
    { label: "Performance", key: "performance" },
    { label: "SEO", key: "seo" },
    { label: "Accessibility", key: "accessibility" },
    { label: "Best practices", key: "bestPractices" },
  ];

  /* ----- Legacy single snapshot or error ----- */
  if (!isLighthouseDualBundle(data)) {
    const o = data as Record<string, unknown>;
    if ("error" in o && typeof o.error === "string") {
      return (
        <div className="mt-6">
          <LighthouseErrorPanel err={o.error} psiWebUrl={typeof o.psiWebUrl === "string" ? o.psiWebUrl : ""} />
        </div>
      );
    }
    const scores = o.scores as Record<string, number | null> | undefined;
    if (!scores) return null;
    const opps = Array.isArray(o.opportunities) ? o.opportunities : [];
    const psiWebUrl = typeof o.psiWebUrl === "string" ? o.psiWebUrl : "";
    const strategy = o.strategy === "desktop" ? "Desktop" : "Mobile";
    return (
      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold text-slate-900">Lighthouse lab · {strategy}</p>
            <p className="text-xs text-muted">Older audit (single device). Run again for mobile + desktop.</p>
          </div>
          {psiWebUrl ? (
            <a href={psiWebUrl} className="text-xs font-semibold text-accent hover:underline" target="_blank" rel="noreferrer">
              Full PSI report ↗
            </a>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-center gap-6 px-4 py-6 sm:gap-10 sm:px-8">
          {items.map((x) => (
            <ScoreGauge key={x.label} label={x.label} value={scores[x.key] ?? null} />
          ))}
        </div>
        {opps.length > 0 ? (
          <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Top opportunities</p>
            <ul className="mt-2 max-h-48 divide-y divide-slate-200 overflow-y-auto text-sm">
              {(opps as { title?: string; displayValue?: string; description?: string }[]).map((p, i) => (
                <li key={i} className="py-2.5">
                  <span className="font-semibold text-slate-900">{p.title || "Opportunity"}</span>
                  {p.displayValue ? <span className="text-muted"> · {p.displayValue}</span> : null}
                  {p.description ? <p className="mt-0.5 line-clamp-2 text-xs text-muted">{p.description}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  /* ----- Dual mobile + desktop ----- */
  const bundle = data;
  const psiWebUrl = bundle.psiWebUrl;
  const active = tab === "mobile" ? bundle.mobile : bundle.desktop;
  const mobileOk = isLighthouseSnapshot(bundle.mobile);
  const desktopOk = isLighthouseSnapshot(bundle.desktop);

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-semibold text-slate-900">Lighthouse lab</p>
          <p className="text-xs text-muted">Google PageSpeed · same scores as Chrome Lighthouse</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full bg-slate-200/80 p-1">
            <button
              type="button"
              onClick={() => setTab("mobile")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                tab === "mobile" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mobile
            </button>
            <button
              type="button"
              onClick={() => setTab("desktop")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                tab === "desktop" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Desktop
            </button>
          </div>
          {psiWebUrl ? (
            <a href={psiWebUrl} className="text-xs font-semibold text-accent hover:underline" target="_blank" rel="noreferrer">
              Full PSI report ↗
            </a>
          ) : null}
        </div>
      </div>

      {!mobileOk && !desktopOk ? (
        <div className="p-4 sm:p-6">
          <LighthouseErrorPanel
            title="Mobile & desktop lab runs failed"
            err={
              !isLighthouseSnapshot(bundle.mobile) && !isLighthouseSnapshot(bundle.desktop)
                ? `Mobile: ${bundle.mobile.error}\nDesktop: ${bundle.desktop.error}`
                : "Lighthouse unavailable."
            }
            psiWebUrl={psiWebUrl}
          />
        </div>
      ) : !isLighthouseSnapshot(active) ? (
        <div className="p-4 sm:p-6">
          <LighthouseErrorPanel
            title={`${tab === "mobile" ? "Mobile" : "Desktop"} lab run failed`}
            err={active.error}
            psiWebUrl={psiWebUrl}
          />
          <p className="mt-3 text-xs text-muted">
            {tab === "mobile" && desktopOk
              ? "Switch to Desktop to see scores from the successful run."
              : tab === "desktop" && mobileOk
                ? "Switch to Mobile to see scores from the successful run."
                : null}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap justify-center gap-6 px-4 py-6 sm:gap-10 sm:px-8">
            {items.map((x) => (
              <ScoreGauge key={x.label} label={x.label} value={active.scores[x.key] ?? null} />
            ))}
          </div>
          {active.opportunities.length > 0 ? (
            <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-4 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Top opportunities · {tab === "mobile" ? "Mobile" : "Desktop"}
              </p>
              <ul className="mt-2 max-h-48 divide-y divide-slate-200 overflow-y-auto text-sm">
                {active.opportunities.map((p, i) => (
                  <li key={i} className="py-2.5">
                    <span className="font-semibold text-slate-900">{p.title || "Opportunity"}</span>
                    {p.displayValue ? <span className="text-muted"> · {p.displayValue}</span> : null}
                    {p.description ? <p className="mt-0.5 line-clamp-2 text-xs text-muted">{p.description}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function CopyRow({ label, text }: { label: string; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="border-b border-slate-100 py-4 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setDone(true);
              setTimeout(() => setDone(false), 2000);
            } catch {
              /* ignore */
            }
          }}
          className="shrink-0 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-white opacity-90 hover:opacity-100"
        >
          {done ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-800">{text}</p>
    </div>
  );
}

function OpportunityGauge({ value, label, rationale }: { value: number; label: string; rationale: string }) {
  const deg = Math.round((value / 100) * 360);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-8">
      <div
        className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full shadow-inner"
        style={{
          background: `conic-gradient(rgb(6 182 212) ${deg}deg, rgb(226 232 240) 0deg)`,
        }}
      >
        <div className="flex h-[5.5rem] w-[5.5rem] flex-col items-center justify-center rounded-full bg-white shadow-sm">
          <span className="text-3xl font-black tabular-nums text-slate-900">{value}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted">Index</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="text-lg font-bold text-slate-900">{label}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{rationale}</p>
        <p className="mt-2 text-xs text-slate-500">
          This index blends your live page signals, issue severity, and lab data when available. It is not the same as
          Lighthouse performance score.
        </p>
      </div>
    </div>
  );
}

function FindingRow({ f, index }: { f: Finding; index: number }) {
  const { bar, badge } = severityStyles(f.severity);
  return (
    <li className="relative flex gap-4 border-b border-slate-100 py-5 last:border-0">
      <div className="flex flex-col items-center gap-1 pt-1">
        <div className={`h-10 w-1 rounded-full ${bar}`} aria-hidden />
        <span className="text-[10px] font-bold tabular-nums text-slate-400">#{index + 1}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-primary">{f.area}</span>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${badge}`}
          >
            {f.severity}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{f.detail}</p>
        <p className="mt-3 border-l-2 border-cyan-400/80 pl-3 text-sm font-medium leading-relaxed text-cyan-950">
          <span className="text-[10px] font-bold uppercase tracking-wide text-cyan-800">Fix · </span>
          {f.suggestion}
        </p>
      </div>
    </li>
  );
}

function SocialCaptionsFromAudit({ auditId }: { auditId: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [blob, setBlob] = useState<string | null>(null);

  async function generate() {
    setErr("");
    setBlob(null);
    setLoading(true);
    try {
      const res = await fetch("/api/social-post-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        linkedin?: string | null;
        instagram?: string | null;
        facebook?: string | null;
      };
      if (!res.ok) throw new Error(j.error || "Generation failed");
      const parts: string[] = [];
      if (j.linkedin) parts.push(`LinkedIn\n${j.linkedin}`);
      if (j.instagram) parts.push(`Instagram\n${j.instagram}`);
      if (j.facebook) parts.push(`Facebook\n${j.facebook}`);
      setBlob(parts.join("\n\n---\n\n") || "No captions returned for your plan.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-10 rounded-2xl border border-violet-200 bg-violet-50/40 p-5">
      <p className="text-sm font-bold text-slate-900">Social post pack (from this audit)</p>
      <p className="mt-1 text-xs text-muted">
        Starter: LinkedIn only. Growth/Elite: LinkedIn, Instagram, and Facebook. Uses server GEMINI_API_KEY or your Gemini key
        in Business profile.
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={() => void generate()}
        className="mt-3 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
      >
        {loading ? "Generating…" : "Generate captions"}
      </button>
      {err ? <p className="mt-2 text-sm text-red-800">{err}</p> : null}
      {blob ? (
        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800">
          {blob}
        </pre>
      ) : null}
    </div>
  );
}

function SocialProofFromRows({ rows }: { rows: Row[] }) {
  if (rows.length < 2) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <strong className="text-slate-900">Social proof kit</strong> — Run at least two site audits to generate lines that quote
        measurable score movement.
      </div>
    );
  }
  const progress = buildAuditProgressCompare(
    rows[rows.length - 1] as unknown as SiteAudit,
    rows[0] as unknown as SiteAudit
  );
  const lines = buildSocialProofLines(progress);
  if (lines.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <strong className="text-slate-900">Social proof kit</strong> — No measurable deltas yet between your first and latest
        audits. Re-run after you ship fixes.
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-pink-200 bg-pink-50/50 px-5 py-4">
      <p className="text-xs font-bold uppercase tracking-wide text-pink-900">Social proof lines</p>
      <p className="mt-1 text-xs text-muted">Uses before/after audit numbers only.</p>
      <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-slate-800">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function AuditDelta({ current, previous }: { current: Row; previous: Row }) {
  const a = lighthouseScores(current.lighthouse);
  const b = lighthouseScores(previous.lighthouse);
  const dCurr = parseDeliverables(current.deliverables);
  const dPrev = parseDeliverables(previous.deliverables);
  if (!a && !b && !dCurr && !dPrev) return null;
  const parts: string[] = [];
  if (a && b) {
    (["performance", "seo"] as const).forEach((k) => {
      const da = a[k];
      const db = b[k];
      if (da != null && db != null && da !== db) {
        parts.push(`${k} ${db} → ${da} (${da >= db ? "+" : ""}${da - db})`);
      }
    });
  }
  if (dCurr && dPrev && dCurr.opportunityIndex !== dPrev.opportunityIndex) {
    parts.push(
      `Opportunity index ${dPrev.opportunityIndex} → ${dCurr.opportunityIndex} (${dCurr.opportunityIndex >= dPrev.opportunityIndex ? "+" : ""}${dCurr.opportunityIndex - dPrev.opportunityIndex})`
    );
  }
  if (parts.length === 0) return null;
  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/60 px-5 py-4">
      <p className="text-xs font-bold uppercase tracking-wide text-violet-900">Since your last run</p>
      <ul className="mt-2 list-inside list-disc text-sm text-violet-950">
        {parts.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

function AuditLoading() {
  return (
    <div className="w-full max-w-[1536px] animate-pulse space-y-6">
      <div className="h-40 rounded-2xl bg-slate-200/80" />
      <div className="h-12 w-full rounded-xl bg-slate-200/80" />
      <div className="h-64 rounded-2xl bg-slate-200/60" />
    </div>
  );
}

export default function AuditClientPage() {
  const gridPatternId = useId().replace(/:/g, "");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [primaryAuditUrl, setPrimaryAuditUrl] = useState<string | null>(null);
  /** When true, only the newest audit is shown (avoids stacked duplicate-looking Lighthouse blocks). */
  const [latestOnly, setLatestOnly] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/audit");
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as Row[] | { audits?: Row[]; primaryUrl?: string | null };
        if (Array.isArray(data)) {
          setRows(data);
          setPrimaryAuditUrl(null);
        } else {
          setRows(Array.isArray(data.audits) ? data.audits : []);
          setPrimaryAuditUrl(typeof data.primaryUrl === "string" ? data.primaryUrl : null);
        }
      }
    } catch {
      setErr("Could not load audits. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function run() {
    setErr("");
    setRunning(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitorUrl: competitorUrl.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error || "Audit failed");
        return;
      }
      await load();
    } catch {
      setErr("Audit request failed. Try again.");
    } finally {
      setRunning(false);
    }
  }

  if (loading) return <AuditLoading />;

  if (forbidden) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Site audit</h1>
        <p className="text-sm text-muted">
          Included on <strong className="text-slate-800">Starter</strong> and higher. Ask your admin to assign a plan.
        </p>
        <Link href="/dashboard" className="text-sm font-semibold text-accent hover:underline">
          ← Overview
        </Link>
      </div>
    );
  }

  const jsonLdString = (obj: Record<string, unknown>) =>
    `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;

  const auditedHost = primaryAuditUrl || rows[0]?.url || null;
  const displayRows = latestOnly && rows.length > 1 ? rows.slice(0, 1) : rows;

  return (
    <div className="w-full max-w-[1536px] space-y-10 pb-16">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-[#0f172a] to-[#0d4f4a] px-6 py-10 text-white shadow-2xl sm:px-10 sm:py-12">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
          aria-hidden
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id={gridPatternId} width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${gridPatternId})`} />
        </svg>
        <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-violet-500/25 blur-3xl" />

        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300/90">Site audit</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Your site, measured and improved</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300">
            Every run analyzes <strong className="text-white">your business URL from your profile</strong> — findings,
            Lighthouse (when configured), and the SEO pack are always about <em>your</em> pages.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
            The optional <strong className="text-white">competitor URL</strong> only adds a second HTML fetch so we can show
            side-by-side signals and an AI &quot;gap&quot; paragraph — it does not switch the audit to their domain.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-stretch">
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-lg font-black text-slate-950">
                1
              </div>
              <div className="min-w-0 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-200/90">Audited URL</p>
                <p className="truncate text-sm font-semibold text-white">{auditedHost ?? "Set in your profile"}</p>
              </div>
            </div>
            <div className="hidden items-center justify-center text-slate-500 sm:flex" aria-hidden>
              <span className="text-2xl">→</span>
            </div>
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/90 text-lg font-black text-white">
                2
              </div>
              <div className="min-w-0 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-200/90">Optional</p>
                <p className="text-sm font-medium text-slate-200">Competitor for compare + gap story</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="rounded-3xl bg-gradient-to-b from-slate-50 to-white px-6 py-8 ring-1 ring-slate-200/80 sm:px-8">
        <h2 className="text-lg font-bold text-slate-900">Run a new audit</h2>
        <p className="mt-1 text-sm text-slate-600">
          Primary URL is always <span className="font-semibold text-slate-800">{auditedHost ?? "your profile website"}</span>
          . Add a competitor below if you want the comparison strip and gap narrative.
        </p>
        <label className="mt-6 block text-xs font-bold uppercase tracking-wide text-slate-500">Competitor URL (optional)</label>
        <input
          type="url"
          value={competitorUrl}
          onChange={(e) => setCompetitorUrl(e.target.value)}
          placeholder="https://competitor.com"
          className="mt-2 w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm shadow-inner ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-cyan-500/40"
        />
        <p className="mt-2 text-xs text-slate-500">Direct competitor homepage works best (not aggregators or social profiles).</p>
        <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">Typical run 30–90 seconds · needs server <code className="rounded bg-slate-200/80 px-1">GEMINI_API_KEY</code></p>
          <button
            type="button"
            disabled={running}
            onClick={() => void run()}
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg hover:brightness-110 disabled:opacity-50"
          >
            {running ? "Running audit…" : "Run audit"}
          </button>
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
          <p className="text-lg font-semibold text-slate-900">No audits yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Run once to generate live HTML signals, deliverables, and findings. Server needs{" "}
            <code className="rounded bg-white px-1 font-mono text-xs">GEMINI_API_KEY</code>.{" "}
            <code className="rounded bg-white px-1 font-mono text-xs">PAGESPEED_INSIGHTS_API_KEY</code> adds lab scores.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {rows.length > 1 ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-slate-900">{rows.length} saved audits</span>
                <span className="text-muted"> · </span>
                {latestOnly ? (
                  <span className="text-slate-600">Showing the latest run only</span>
                ) : (
                  <span className="text-slate-600">Showing all {rows.length} runs (newest first)</span>
                )}
              </p>
              <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={latestOnly}
                  onChange={(e) => setLatestOnly(e.target.checked)}
                />
                Latest only
              </label>
            </div>
          ) : null}

          {rows.length > 0 ? <SocialProofFromRows rows={rows} /> : null}

          {displayRows.map((r) => {
            const globalIdx = rows.findIndex((x) => x.id === r.id);
            const idx = globalIdx >= 0 ? globalIdx : 0;
            const runOf = rows.length;
            const runDate = new Date(r.createdAt);
            const runDateStr = runDate.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            });
            const ordered = sortedFindings(r.findings);
            const highCountRow = ordered.filter((f) => severityOrder(f.severity) === 0).length;
            const d = parseDeliverables(r.deliverables);
            const snap = parsePageSnapshot(r.pageSnapshot);
            const prev = rows[idx + 1];
            return (
              <article key={r.id} className="scroll-mt-6">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Run {idx + 1} of {runOf}
                      </span>
                      {idx === 0 ? (
                        <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-900">
                          Latest
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-200/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                          Older
                        </span>
                      )}
                      <span className="text-xs font-medium text-slate-600">· {runDateStr}</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">Primary URL</p>
                    <p className="mt-1 break-all text-base font-semibold text-primary">{r.url}</p>
                  </div>
                  {ordered.length > 0 ? (
                    <div className="rounded-xl bg-slate-100 px-3 py-2 text-center">
                      <p className="text-2xl font-bold tabular-nums text-slate-900">{ordered.length}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Issues tracked</p>
                    </div>
                  ) : null}
                </div>

                {prev ? <AuditDelta current={r} previous={prev} /> : null}

                <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(300px,420px)] xl:items-start xl:gap-x-10 2xl:grid-cols-[minmax(0,1fr)_460px]">
                  <div className="min-w-0 space-y-8 border-t border-slate-200 pt-8 xl:border-t-0 xl:pt-0">
                    {snap ? <ComparisonSnapshotPanel snap={snap} /> : null}

                    {d ? (
                      <div className="border-t border-slate-200 pt-8 xl:border-t xl:pt-8">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Opportunity index</p>
                        <div className="mt-4">
                          <OpportunityGauge value={d.opportunityIndex} label={d.opportunityLabel} rationale={d.opportunityRationale} />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
                        This run predates the deliverables engine. Run a new audit to unlock the full pack.
                      </div>
                    )}

                    <LighthouseBlock data={r.lighthouse} />

                    <div className="border-l-4 border-primary/70 pl-5 sm:pl-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-primary">Strategic summary</span>
                        {highCountRow > 0 ? (
                          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-900">
                            {highCountRow} critical theme{highCountRow === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-800">{r.summary}</p>
                    </div>
                  </div>

                  <aside className="min-w-0 space-y-10 border-t border-slate-200 pt-10 xl:border-l xl:border-t-0 xl:pl-10 xl:pt-8">
                    {d ? (
                      <div className="space-y-10">
                        <div>
                          <h2 className="text-lg font-bold text-slate-900">Copy-ready SEO pack</h2>
                          <p className="mt-1 text-sm text-muted">Paste into CMS or hand to dev — copy per block.</p>
                          <div className="mt-4 divide-y divide-slate-200 rounded-2xl bg-white px-4 ring-1 ring-slate-200/80">
                            {d.metaTitleVariants.map((t, i) => (
                              <CopyRow key={`mt-${i}`} label={`Meta title option ${i + 1}`} text={t} />
                            ))}
                            {d.metaDescriptionVariants.map((t, i) => (
                              <CopyRow key={`md-${i}`} label={`Meta description option ${i + 1}`} text={t} />
                            ))}
                          </div>
                        </div>

                        <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-slate-100 shadow-xl">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">JSON-LD (schema.org)</p>
                            <button
                              type="button"
                              onClick={() => void navigator.clipboard.writeText(jsonLdString(d.jsonLdObject))}
                              className="rounded-lg bg-cyan-500 px-3 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-cyan-400"
                            >
                              Copy full script tag
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-slate-400">{d.schemaInstallHint}</p>
                          <pre className="mt-3 max-h-52 overflow-auto rounded-lg bg-black/40 p-4 text-[11px] leading-relaxed text-emerald-200/90">
                            {JSON.stringify(d.jsonLdObject, null, 2)}
                          </pre>
                        </div>

                        {d.competitorGapAnalysis?.trim() ? (
                          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-[1px] shadow-lg">
                            <div className="rounded-[1.4rem] bg-white px-5 py-5 sm:px-6">
                              <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                                AI competitor gap (your site vs their HTML)
                              </p>
                              <p className="mt-3 text-sm leading-relaxed text-slate-800">{d.competitorGapAnalysis}</p>
                            </div>
                          </div>
                        ) : null}

                        <div className="grid gap-8 lg:grid-cols-1">
                          <div>
                            <p className="text-sm font-bold text-slate-900">Content pillar ideas</p>
                            <ul className="mt-3 space-y-0 divide-y divide-slate-200 border-t border-slate-200">
                              {d.contentPillarIdeas.map((x, i) => (
                                <li key={i} className="py-3 text-sm leading-relaxed text-slate-800">
                                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-[11px] font-bold text-cyan-800">
                                    {i + 1}
                                  </span>
                                  {x}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">Internal linking ideas</p>
                            <ul className="mt-3 space-y-0 divide-y divide-slate-200 border-t border-slate-200">
                              {d.internalLinkingIdeas.map((x, i) => (
                                <li key={i} className="py-3 text-sm leading-relaxed text-slate-800">
                                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-800">
                                    {i + 1}
                                  </span>
                                  {x}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {d.ctaMicrocopyIdeas.length > 0 ? (
                          <div>
                            <p className="text-sm font-bold text-slate-900">CTA microcopy</p>
                            <div className="mt-3 space-y-2">
                              {d.ctaMicrocopyIdeas.map((t, i) => (
                                <CopyRow key={`cta-${i}`} label={`CTA ${i + 1}`} text={t} />
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {d.ctaFormRecommendations ? (
                          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              CTA and forms (Phase 3)
                            </p>
                            <div className="mt-3 space-y-3">
                              <CopyRow label="Primary CTA" text={d.ctaFormRecommendations.primaryCta} />
                              <CopyRow label="Secondary CTA" text={d.ctaFormRecommendations.secondaryCta} />
                            </div>
                            {d.ctaFormRecommendations.formFieldTips.length > 0 ? (
                              <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-slate-800">
                                {d.ctaFormRecommendations.formFieldTips.map((t, i) => (
                                  <li key={i}>{t}</li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ) : null}

                        {d.faqBlocks && d.faqBlocks.length > 0 ? (
                          <div>
                            <p className="text-sm font-bold text-slate-900">FAQ blocks</p>
                            <ul className="mt-3 space-y-4 divide-y divide-slate-200 border-t border-slate-200">
                              {d.faqBlocks.map((f, i) => (
                                <li key={i} className="pt-4 first:pt-3">
                                  <p className="text-sm font-semibold text-slate-900">{f.question}</p>
                                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{f.answer}</p>
                                  <button
                                    type="button"
                                    className="mt-2 text-[11px] font-bold uppercase tracking-wide text-accent hover:underline"
                                    onClick={() =>
                                      void navigator.clipboard.writeText(`Q: ${f.question}\nA: ${f.answer}`)
                                    }
                                  >
                                    Copy Q&amp;A pair
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {d.objectionHandlers && d.objectionHandlers.length > 0 ? (
                          <div>
                            <p className="text-sm font-bold text-slate-900">Objection handlers</p>
                            <ul className="mt-3 space-y-4 divide-y divide-slate-200 border-t border-slate-200">
                              {d.objectionHandlers.map((o, i) => (
                                <li key={i} className="pt-4 first:pt-3">
                                  <p className="text-xs font-bold uppercase text-amber-800">{o.objection}</p>
                                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{o.response}</p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {d.leadCaptureReview ? (
                          <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/50 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-bold text-slate-900">Lead capture review</p>
                              <span className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-black tabular-nums text-white">
                                {d.leadCaptureReview.score}/100
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-relaxed text-slate-800">{d.leadCaptureReview.summary}</p>
                            <ul className="mt-4 space-y-2">
                              {d.leadCaptureReview.items.map((it, i) => (
                                <li
                                  key={i}
                                  className="flex gap-2 rounded-lg border border-emerald-100 bg-white/80 px-3 py-2 text-sm"
                                >
                                  <span
                                    className={`shrink-0 font-bold uppercase ${
                                      it.status === "pass"
                                        ? "text-emerald-700"
                                        : it.status === "fail"
                                          ? "text-red-700"
                                          : "text-amber-700"
                                    }`}
                                  >
                                    {it.status}
                                  </span>
                                  <span>
                                    <span className="font-medium text-slate-900">{it.label}</span>
                                    {it.note ? <span className="text-muted"> — {it.note}</span> : null}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {d.landingLeadMagnet ? (
                          <div className="rounded-3xl border border-sky-200 bg-sky-50/60 p-5">
                            <p className="text-xs font-bold uppercase tracking-wide text-sky-900">Lead magnet landing blocks</p>
                            <p className="mt-1 text-xs text-muted">Paste into a landing page or lead-capture template.</p>
                            <div className="mt-4 space-y-3">
                              <CopyRow label="Headline" text={d.landingLeadMagnet.headline} />
                              <CopyRow label="Subhead" text={d.landingLeadMagnet.subhead} />
                              <div>
                                <p className="text-xs font-semibold text-slate-600">Bullets</p>
                                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-800">
                                  {d.landingLeadMagnet.bullets.map((b, i) => (
                                    <li key={i}>{b}</li>
                                  ))}
                                </ul>
                                <button
                                  type="button"
                                  className="mt-2 text-[11px] font-bold uppercase tracking-wide text-accent hover:underline"
                                  onClick={() =>
                                    void navigator.clipboard.writeText(d.landingLeadMagnet.bullets.join("\n"))
                                  }
                                >
                                  Copy all bullets
                                </button>
                              </div>
                              <CopyRow label="Primary CTA" text={d.landingLeadMagnet.primaryCta} />
                              <CopyRow label="Form intro" text={d.landingLeadMagnet.formIntro} />
                            </div>
                          </div>
                        ) : null}

                        {hasLocalSeoDeliverables(d) ? (
                          <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5">
                            <p className="text-xs font-bold uppercase tracking-wide text-amber-900">Local SEO pack (drafts)</p>
                            <p className="mt-1 text-xs text-muted">
                              For Google Business Profile style work. Paste manually; we do not post to GBP from this app.
                            </p>
                            {d.localSeoPack.gbpPostIdeas.length > 0 ? (
                              <div className="mt-3">
                                <p className="text-xs font-semibold text-slate-700">GBP post ideas</p>
                                <ul className="mt-2 list-inside list-disc text-sm text-slate-800">
                                  {d.localSeoPack.gbpPostIdeas.map((x, i) => (
                                    <li key={i}>{x}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            {d.localSeoPack.qaSuggestions.length > 0 ? (
                              <ul className="mt-4 space-y-3 border-t border-amber-200/60 pt-4">
                                {d.localSeoPack.qaSuggestions.map((q, i) => (
                                  <li key={i} className="text-sm">
                                    <p className="font-semibold text-slate-900">{q.question}</p>
                                    <p className="mt-1 text-slate-700">{q.suggestedAnswer}</p>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                            {d.localSeoPack.napChecklist.length > 0 ? (
                              <ul className="mt-4 list-inside list-disc text-sm text-slate-800">
                                {d.localSeoPack.napChecklist.map((x, i) => (
                                  <li key={i}>{x}</li>
                                ))}
                              </ul>
                            ) : null}
                            {d.localSeoPack.reviewResponseSnippets.length > 0 ? (
                              <div className="mt-4">
                                <p className="text-xs font-semibold text-slate-700">Review reply snippets</p>
                                <ul className="mt-2 space-y-2 text-sm text-slate-800">
                                  {d.localSeoPack.reviewResponseSnippets.map((x, i) => (
                                    <li key={i} className="rounded-lg bg-white/80 px-3 py-2">
                                      {x}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {hasAdCreativeDeliverables(d) ? (
                          <div className="rounded-3xl border border-violet-300 bg-violet-50/50 p-5">
                            <p className="text-xs font-bold uppercase tracking-wide text-violet-900">
                              Ad creative angles (Elite)
                            </p>
                            <p className="mt-1 text-xs text-muted">
                              Draft copy for Meta and Google RSAs. Respect character limits in your ads editor.
                            </p>
                            <div className="mt-4 grid gap-6 lg:grid-cols-2">
                              <div>
                                <p className="text-sm font-bold text-slate-900">Meta-style</p>
                                {d.adCreativeAngles.meta.headlines.map((t, i) => (
                                  <CopyRow key={`mh-${i}`} label={`Headline ${i + 1}`} text={t} />
                                ))}
                                {d.adCreativeAngles.meta.primaryTexts.map((t, i) => (
                                  <CopyRow key={`mp-${i}`} label={`Primary text ${i + 1}`} text={t} />
                                ))}
                                {d.adCreativeAngles.meta.descriptions.map((t, i) => (
                                  <CopyRow key={`md-${i}`} label={`Description ${i + 1}`} text={t} />
                                ))}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">Google RSA-style</p>
                                {d.adCreativeAngles.google.headlines.map((t, i) => (
                                  <CopyRow key={`gh-${i}`} label={`Headline ${i + 1}`} text={t} />
                                ))}
                                {d.adCreativeAngles.google.descriptions.map((t, i) => (
                                  <CopyRow key={`gd-${i}`} label={`Description ${i + 1}`} text={t} />
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Prioritized findings</h2>
                      <p className="mt-1 text-sm text-muted">Grounded in your live HTML. Ordered by severity.</p>
                      <ul className="mt-2">
                        {ordered.map((f, i) => (
                          <FindingRow key={`${r.id}-${i}`} f={f} index={i} />
                        ))}
                      </ul>
                    </div>
                  </aside>
                </div>

                <SocialCaptionsFromAudit auditId={r.id} />
              </article>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-sm font-semibold">
        <Link href="/dashboard/on-page-checklist" className="text-accent hover:underline">
          On-page checklist →
        </Link>
        <Link href="/dashboard/calendar" className="text-accent hover:underline">
          Content calendar →
        </Link>
        <Link href="/dashboard/competitors" className="text-accent hover:underline">
          Competitors →
        </Link>
        <Link href="/dashboard/site-crawl" className="text-accent hover:underline">
          Multi-page site crawl →
        </Link>
        <Link href="/dashboard/analytics" className="text-accent hover:underline">
          Web analytics (GA4) →
        </Link>
        <Link href="/dashboard/share-report" className="text-accent hover:underline">
          Share client report →
        </Link>
        <Link href="/dashboard" className="text-accent hover:underline">
          ← Back to overview
        </Link>
      </div>
    </div>
  );
}
