"use client";

import { useEffect, useState } from "react";

type UserOpt = { id: string; name: string; email: string };

export default function AdminGeneratePage() {
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [userId, setUserId] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

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
      body: JSON.stringify({ userId }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error || "Generation failed");
      return;
    }
    setMsg(`Created blog: ${data.title} (${data.id})`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Generate blog</h1>
        <p className="mt-1 text-sm text-muted">
          Runs Gemini for the selected user. They need an active SEO_CONTENT subscription and must be under their weekly cap.
        </p>
      </div>
      <form onSubmit={generate} className="space-y-4 rounded-xl border border-slate-200 bg-card p-6 shadow-sm">
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
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Generating…" : "Generate one blog"}
        </button>
      </form>
    </div>
  );
}
