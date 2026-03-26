"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UserRow = {
  id: string;
  name: string;
  businessName: string | null;
  businessUrl: string | null;
  businessDescription: string | null;
  industry: string | null;
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
          <label className="text-sm font-medium text-slate-700">Industry</label>
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
