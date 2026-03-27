"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { IndustryVertical, MarketingGoal } from "@prisma/client";
import { INDUSTRY_VERTICAL_OPTIONS, MARKETING_GOAL_OPTIONS } from "@/lib/marketing-presets";

type UserRow = {
  id: string;
  name: string;
  businessName: string | null;
  businessUrl: string | null;
  businessDescription: string | null;
  industry: string | null;
  industryVertical: IndustryVertical;
  marketingGoal: MarketingGoal;
  targetKeywords: string | null;
  internalLinks: unknown;
  isActive: boolean;
};

export function UserEditForm({ user }: { user: UserRow }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    name: user.name,
    businessName: user.businessName || "",
    businessUrl: user.businessUrl || "",
    businessDescription: user.businessDescription || "",
    industry: user.industry || "",
    industryVertical: user.industryVertical,
    marketingGoal: user.marketingGoal,
    targetKeywords: user.targetKeywords || "",
    internalLinksJson: JSON.stringify(user.internalLinks ?? [], null, 2),
    isActive: user.isActive,
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    let internalLinks: unknown;
    try {
      internalLinks = JSON.parse(form.internalLinksJson);
      if (!Array.isArray(internalLinks)) throw new Error();
    } catch {
      setMsg("Internal links must be a JSON array.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/admin/users/${user.id}`, {
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
        isActive: form.isActive,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setMsg("Save failed.");
      return;
    }
    setMsg("Saved.");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-card p-6 shadow-sm">
      <h2 className="font-semibold text-slate-900">Business profile</h2>
      {msg ? <p className="text-sm text-accent">{msg}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            id="active"
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          />
          <label htmlFor="active" className="text-sm text-slate-700">
            Account active (can sign in)
          </label>
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
          <label className="text-sm font-medium text-slate-700">Description</label>
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
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Marketing goal</label>
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
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Industry (free text)</label>
          <input
            value={form.industry}
            onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Target keywords</label>
          <input
            value={form.targetKeywords}
            onChange={(e) => setForm((f) => ({ ...f, targetKeywords: e.target.value }))}
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
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
