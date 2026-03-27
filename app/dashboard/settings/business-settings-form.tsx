"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { IndustryVertical, MarketingGoal } from "@prisma/client";
import { INDUSTRY_VERTICAL_OPTIONS, MARKETING_GOAL_OPTIONS } from "@/lib/marketing-presets";
import { FieldTooltip } from "@/components/field-tooltip";

type Initial = {
  name: string;
  email: string;
  businessName: string | null;
  businessUrl: string | null;
  businessDescription: string | null;
  industry: string | null;
  industryVertical: IndustryVertical;
  marketingGoal: MarketingGoal;
  targetKeywords: string | null;
  internalLinks: unknown;
  monthlyExecutiveReportOptIn: boolean;
  localSeoPackEnabled: boolean;
  hasGeminiKey: boolean;
  hasPageSpeedKey: boolean;
};

export function BusinessSettingsForm({
  initial,
  canMonthlyReport,
}: {
  initial: Initial;
  canMonthlyReport: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [form, setForm] = useState({
    name: initial.name,
    businessName: initial.businessName || "",
    businessUrl: initial.businessUrl || "",
    businessDescription: initial.businessDescription || "",
    industry: initial.industry || "",
    industryVertical: initial.industryVertical,
    marketingGoal: initial.marketingGoal,
    targetKeywords: initial.targetKeywords || "",
    internalLinksJson: JSON.stringify(initial.internalLinks ?? [], null, 2),
    monthlyExecutiveReportOptIn: initial.monthlyExecutiveReportOptIn && canMonthlyReport,
    localSeoPackEnabled: initial.localSeoPackEnabled,
    geminiApiKeyInput: "",
    pageSpeedApiKeyInput: "",
    removeGeminiKey: false,
    removePageSpeedKey: false,
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    let internalLinks: unknown;
    try {
      internalLinks = JSON.parse(form.internalLinksJson);
      if (!Array.isArray(internalLinks)) throw new Error();
    } catch {
      setMsg({ type: "err", text: "Internal links must be a JSON array." });
      return;
    }
    const keyPatch: Record<string, unknown> = {};
    if (form.removeGeminiKey) keyPatch.geminiApiKey = null;
    else if (form.geminiApiKeyInput.trim()) keyPatch.geminiApiKey = form.geminiApiKeyInput.trim();
    if (form.removePageSpeedKey) keyPatch.pageSpeedApiKey = null;
    else if (form.pageSpeedApiKeyInput.trim()) keyPatch.pageSpeedApiKey = form.pageSpeedApiKeyInput.trim();

    setSaving(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        businessName: form.businessName || null,
        businessUrl: form.businessUrl || null,
        businessDescription: form.businessDescription || null,
        industry: form.industry || null,
        industryVertical: form.industryVertical,
        marketingGoal: form.marketingGoal,
        targetKeywords: form.targetKeywords || null,
        internalLinks,
        monthlyExecutiveReportOptIn: canMonthlyReport ? form.monthlyExecutiveReportOptIn : false,
        localSeoPackEnabled: form.localSeoPackEnabled,
        ...keyPatch,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setMsg({ type: "err", text: j.error || "Save failed." });
      return;
    }
    setMsg({ type: "ok", text: "Saved. New audits and blogs will use these presets." });
    setForm((f) => ({
      ...f,
      geminiApiKeyInput: "",
      pageSpeedApiKeyInput: "",
      removeGeminiKey: false,
      removePageSpeedKey: false,
    }));
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-6 rounded-2xl border border-slate-200 bg-card p-6 shadow-sm sm:p-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Business profile & presets</h1>
        <p className="mt-1 text-sm text-muted">
          Presets tune AI audits and blog generation. You can still describe your niche in the free-text industry field.
        </p>
      </div>

      {msg ? (
        <p className={`text-sm ${msg.type === "ok" ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Full name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input value={initial.email} disabled className="mt-1 w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-muted" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Business name</label>
          <input
            value={form.businessName}
            onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Website</label>
          <input
            value={form.businessUrl}
            onChange={(e) => setForm((f) => ({ ...f, businessUrl: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Business description</label>
          <textarea
            rows={3}
            value={form.businessDescription}
            onChange={(e) => setForm((f) => ({ ...f, businessDescription: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Industry vertical (preset)</label>
          <select
            value={form.industryVertical}
            onChange={(e) =>
              setForm((f) => ({ ...f, industryVertical: e.target.value as IndustryVertical }))
            }
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {INDUSTRY_VERTICAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            {INDUSTRY_VERTICAL_OPTIONS.find((o) => o.value === form.industryVertical)?.hint}
          </p>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Primary marketing goal</label>
          <select
            value={form.marketingGoal}
            onChange={(e) => setForm((f) => ({ ...f, marketingGoal: e.target.value as MarketingGoal }))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {MARKETING_GOAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            {MARKETING_GOAL_OPTIONS.find((o) => o.value === form.marketingGoal)?.hint}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Industry (free text)</label>
          <input
            value={form.industry}
            onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            placeholder="e.g. B2B analytics for clinics"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Target keywords</label>
          <input
            value={form.targetKeywords}
            onChange={(e) => setForm((f) => ({ ...f, targetKeywords: e.target.value }))}
            placeholder="comma separated"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Internal links (JSON)</label>
          <textarea
            rows={4}
            value={form.internalLinksJson}
            onChange={(e) => setForm((f) => ({ ...f, internalLinksJson: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
          />
        </div>

        <div className="sm:col-span-2 rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-4">
          <p className="text-sm font-semibold text-slate-900">Local SEO pack in audits</p>
          <p className="mt-1 text-xs text-muted">
            When your vertical/goal is local and this is on, site audits can include GBP-style drafts (posts, Q&A, NAP
            checklist). Toggle off if you only want generic SEO output.
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              checked={form.localSeoPackEnabled}
              onChange={(e) => setForm((f) => ({ ...f, localSeoPackEnabled: e.target.checked }))}
            />
            <span className="text-sm text-slate-800">Include local SEO pack when my profile fits local search</span>
          </label>
        </div>

        <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4">
          <p className="text-sm font-semibold text-slate-900">Optional API keys (BYOK)</p>
          <p className="mt-1 text-xs text-muted">
            If the server has no global key, or you want your own quota, add keys here. They are stored on your account only.
            Leave blank to keep an existing key; check &quot;Remove&quot; to delete yours.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-slate-700">
                Google AI (Gemini) API key
                <FieldTooltip
                  label="Create a Gemini API key"
                  steps={[
                    "Open Google AI Studio: https://aistudio.google.com/apikey",
                    "Sign in with the Google account that should own billing/quota.",
                    "Click Create API key and choose or create a Google Cloud project.",
                    "Copy the key and paste it below. Do not share it in chat or email.",
                  ]}
                />
              </label>
              {initial.hasGeminiKey ? (
                <p className="mt-1 text-xs text-emerald-800">A key is saved on your account. Enter a new value to replace it.</p>
              ) : (
                <p className="mt-1 text-xs text-muted">No key stored yet.</p>
              )}
              <input
                type="password"
                autoComplete="off"
                value={form.geminiApiKeyInput}
                onChange={(e) => setForm((f) => ({ ...f, geminiApiKeyInput: e.target.value, removeGeminiKey: false }))}
                placeholder="Paste new key or leave blank"
                className="mt-1 w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
              />
              {initial.hasGeminiKey ? (
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.removeGeminiKey}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        removeGeminiKey: e.target.checked,
                        geminiApiKeyInput: e.target.checked ? "" : f.geminiApiKeyInput,
                      }))
                    }
                  />
                  Remove my Gemini key
                </label>
              ) : null}
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-slate-700">
                PageSpeed Insights API key
                <FieldTooltip
                  label="Create a PageSpeed Insights API key"
                  steps={[
                    "Open Google Cloud Console and select (or create) a project.",
                    "APIs & Services → Library → enable “PageSpeed Insights API”.",
                    "APIs & Services → Credentials → Create credentials → API key.",
                    "Restrict the key to PageSpeed Insights API for production, then paste it below.",
                  ]}
                />
              </label>
              {initial.hasPageSpeedKey ? (
                <p className="mt-1 text-xs text-emerald-800">A key is saved on your account. Enter a new value to replace it.</p>
              ) : (
                <p className="mt-1 text-xs text-muted">No key stored yet.</p>
              )}
              <input
                type="password"
                autoComplete="off"
                value={form.pageSpeedApiKeyInput}
                onChange={(e) => setForm((f) => ({ ...f, pageSpeedApiKeyInput: e.target.value, removePageSpeedKey: false }))}
                placeholder="Paste new key or leave blank"
                className="mt-1 w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
              />
              {initial.hasPageSpeedKey ? (
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.removePageSpeedKey}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        removePageSpeedKey: e.target.checked,
                        pageSpeedApiKeyInput: e.target.checked ? "" : f.pageSpeedApiKeyInput,
                      }))
                    }
                  />
                  Remove my PageSpeed key
                </label>
              ) : null}
            </div>
          </div>
        </div>

        {canMonthlyReport ? (
          <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                checked={form.monthlyExecutiveReportOptIn}
                onChange={(e) => setForm((f) => ({ ...f, monthlyExecutiveReportOptIn: e.target.checked }))}
              />
              <span>
                <span className="text-sm font-medium text-slate-900">Monthly executive email</span>
                <span className="mt-1 block text-xs text-muted">
                  Growth: HTML summary once per month (cron). Elite: same email plus a PDF attachment. Requires{" "}
                  <code className="rounded bg-white px-1">RESEND_API_KEY</code> on the server.
                </span>
              </span>
            </label>
          </div>
        ) : (
          <p className="sm:col-span-2 text-xs text-muted">
            Monthly executive emails unlock on <strong className="text-slate-700">Growth</strong> or{" "}
            <strong className="text-slate-700">Elite</strong>.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <Link href="/dashboard" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back to overview
        </Link>
      </div>
    </form>
  );
}
