"use client";

import { useEffect, useState } from "react";

type UserOpt = { id: string; name: string; email: string };

export default function AdminGeneratePage() {
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [userId, setUserId] = useState("");
  const [forceBlog, setForceBlog] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [socialUserId, setSocialUserId] = useState("");
  const [socialContext, setSocialContext] = useState("Spring sale / festival campaign");
  const [socialMsg, setSocialMsg] = useState("");
  const [socialLoading, setSocialLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => setUsers(data as UserOpt[]))
      .catch(() => {});
  }, []);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!userId) {
      setMsg("Select a user.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/admin/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, force: forceBlog }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error || "Generation failed");
      return;
    }
    setMsg(`Created blog: ${data.title} (${data.id})`);
  }

  async function generateSocial(e: React.FormEvent) {
    e.preventDefault();
    setSocialMsg("");
    if (!socialUserId) {
      setSocialMsg("Select a user.");
      return;
    }
    setSocialLoading(true);
    const res = await fetch("/api/admin/social-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: socialUserId, context: socialContext }),
    });
    setSocialLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSocialMsg(data.error || "Failed");
      return;
    }
    setSocialMsg(`Draft saved for ${data.dateKey}. Client sees it under Social ads.`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">AI content</h1>
        <p className="mt-1 text-sm text-muted">Blog generation (Growth/Elite) and social ad drafts (Elite).</p>
      </div>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-card p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Blog post</h2>
        <p className="text-sm text-muted">
          Gemini generates one article from the user&apos;s business profile and site URL. Growth or Elite only. Use
          force for demos when the weekly cap is already used.
        </p>
        <form onSubmit={generate} className="space-y-4">
          {msg ? <p className="text-sm text-accent">{msg}</p> : null}
          <div>
            <label className="text-sm font-medium text-slate-700">User</label>
            <select
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={forceBlog}
              onChange={(e) => setForceBlog(e.target.checked)}
              className="rounded border-slate-300"
            />
            Force (ignore weekly blog limit)
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Generating…" : "Generate one blog"}
          </button>
        </form>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-card p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Social ad draft (Elite)</h2>
        <p className="text-sm text-muted">
          Creates or updates today&apos;s draft (caption + image). Posting to Instagram/Facebook requires Meta Business
          verification and long-lived tokens the client saves under Social ads.
        </p>
        <form onSubmit={generateSocial} className="space-y-4">
          {socialMsg ? <p className="text-sm text-accent">{socialMsg}</p> : null}
          <div>
            <label className="text-sm font-medium text-slate-700">User (Elite plan)</label>
            <select
              required
              value={socialUserId}
              onChange={(e) => setSocialUserId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Context / theme</label>
            <input
              value={socialContext}
              onChange={(e) => setSocialContext(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={socialLoading}
            className="w-full rounded-lg border border-primary py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-60"
          >
            {socialLoading ? "Working…" : "Generate today's ad draft"}
          </button>
        </form>
      </section>
    </div>
  );
}
