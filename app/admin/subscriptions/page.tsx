"use client";

import { useEffect, useState } from "react";

type UserOpt = { id: string; name: string; email: string };

type PlanKey = "STARTER_499" | "GROWTH_899" | "ELITE_1599";

const PLAN_HELP: Record<PlanKey, string> = {
  STARTER_499: "₹499 · Site audit (keywords, meta, on-page suggestions)",
  GROWTH_899: "₹899 · Audit + 3 blogs/week with cover image + 10 backlinks/week (rolls after completion)",
  ELITE_1599: "₹1,599 · Everything in Growth + daily social ad drafts (Meta posting needs app setup)",
};

function syncQuotas(plan: PlanKey) {
  if (plan === "STARTER_499") return { blogsPerWeek: 0, backlinksPerMonth: 0 };
  return { blogsPerWeek: 3, backlinksPerMonth: 10 };
}

export default function AdminSubscriptionsPage() {
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [userId, setUserId] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [plan, setPlan] = useState<PlanKey>("GROWTH_899");
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED" | "CANCELLED">("ACTIVE");
  const [blogsPerWeek, setBlogsPerWeek] = useState(3);
  const [backlinksPerMonth, setBacklinksPerMonth] = useState(10);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        const list = (data as { id: string; name: string; email: string }[]).filter((u) => u.id);
        setUsers(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const q = syncQuotas(plan);
    setBlogsPerWeek(q.blogsPerWeek);
    setBacklinksPerMonth(q.backlinksPerMonth);
  }, [plan]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!userId) {
      setMsg("Select a user.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/admin/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        subscriptionId: subscriptionId || undefined,
        plan,
        status,
        blogsPerWeek,
        backlinksPerMonth,
      }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg(`Saved subscription ${data.id}.`);
    setSubscriptionId(data.id);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Subscriptions</h1>
        <p className="mt-1 text-sm text-muted">
          Assign Starter, Growth, or Elite. Quotas default from the plan; you can override numbers below.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-card p-6 shadow-sm">
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
        <div>
          <label className="text-sm font-medium text-slate-700">Plan</label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as PlanKey)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="STARTER_499">Starter · ₹499</option>
            <option value="GROWTH_899">Growth · ₹899</option>
            <option value="ELITE_1599">Elite · ₹1,599</option>
          </select>
          <p className="mt-1 text-xs text-muted">{PLAN_HELP[plan]}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Existing subscription ID (optional)</label>
          <input
            value={subscriptionId}
            onChange={(e) => setSubscriptionId(e.target.value)}
            placeholder="cuid…"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Blogs / week</label>
            <input
              type="number"
              min={0}
              max={14}
              value={blogsPerWeek}
              onChange={(e) => setBlogsPerWeek(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Backlinks / month cap</label>
            <input
              type="number"
              min={0}
              max={100}
              value={backlinksPerMonth}
              onChange={(e) => setBacklinksPerMonth(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save subscription"}
        </button>
      </form>
    </div>
  );
}
