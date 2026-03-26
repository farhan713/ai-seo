"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    businessName: "",
    businessUrl: "",
    businessDescription: "",
    industry: "",
    targetKeywords: "",
    internalLinksJson: "[]",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    let internalLinks: unknown = [];
    try {
      internalLinks = JSON.parse(form.internalLinksJson || "[]");
      if (!Array.isArray(internalLinks)) throw new Error();
    } catch {
      setError('Internal links must be valid JSON array like [{"url":"https://...","anchor":"Page"}]');
      return;
    }

    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        businessName: form.businessName,
        businessUrl: form.businessUrl || undefined,
        businessDescription: form.businessDescription || undefined,
        industry: form.industry || undefined,
        targetKeywords: form.targetKeywords || undefined,
        internalLinks,
      }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }
    router.push("/login?registered=1");
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-primary">Create account</h1>
        <p className="mt-2 text-sm text-muted">Tell us about your business so we can tailor content.</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {error ? (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Full name</label>
              <input
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Password (min 8)</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Business name</label>
              <input
                required
                value={form.businessName}
                onChange={(e) => update("businessName", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Business website</label>
              <input
                type="url"
                placeholder="https://"
                value={form.businessUrl}
                onChange={(e) => update("businessUrl", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Business description</label>
              <textarea
                rows={3}
                value={form.businessDescription}
                onChange={(e) => update("businessDescription", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Industry</label>
              <input
                value={form.industry}
                onChange={(e) => update("industry", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Target keywords</label>
              <input
                placeholder="comma separated"
                value={form.targetKeywords}
                onChange={(e) => update("targetKeywords", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                Internal links (JSON array)
              </label>
              <textarea
                rows={2}
                value={form.internalLinksJson}
                onChange={(e) => update("internalLinksJson", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
