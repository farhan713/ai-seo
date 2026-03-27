"use client";

import { useState } from "react";
import Link from "next/link";

export type IdeaRow = {
  title: string;
  hook: string;
  format: string;
  rationale: string;
  trendOrOccasion: string;
  suggestedHashtags: string;
};

export function CampaignIdeasClient({
  canCreateDraft,
}: {
  canCreateDraft: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [draftingKey, setDraftingKey] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ date: string; weekday: string; at: string } | null>(null);
  const [ideas, setIdeas] = useState<IdeaRow[]>([]);
  const [err, setErr] = useState("");
  const [draftMsg, setDraftMsg] = useState("");
  const [focusText, setFocusText] = useState("");

  async function generate() {
    setErr("");
    setDraftMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/campaign-ideas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus: focusText }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        ideas?: IdeaRow[];
        calendarDateLabel?: string;
        weekdayName?: string;
        generatedAt?: string;
      };
      if (!res.ok) {
        setErr(j.error || "Could not generate ideas");
        setIdeas([]);
        setMeta(null);
        return;
      }
      setIdeas(Array.isArray(j.ideas) ? j.ideas : []);
      setMeta(
        j.calendarDateLabel && j.weekdayName && j.generatedAt
          ? { date: j.calendarDateLabel, weekday: j.weekdayName, at: j.generatedAt }
          : null
      );
    } finally {
      setLoading(false);
    }
  }

  async function createDraft(idea: IdeaRow) {
    if (!canCreateDraft) return;
    setDraftMsg("");
    const key = idea.title + idea.hook;
    setDraftingKey(key);
    try {
      const res = await fetch("/api/campaign-ideas/create-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; socialAd?: { dateKey: string } };
      if (!res.ok) {
        setDraftMsg(j.error || "Could not create draft");
        return;
      }
      setDraftMsg(
        `Draft saved for ${j.socialAd?.dateKey ?? "today"}. Open Social ads to copy and publish.`
      );
    } finally {
      setDraftingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-card p-5 shadow-sm">
        <p className="text-sm text-muted">
          AI suggests angles based on <strong className="text-slate-800">today&apos;s date</strong>, common seasonal moments,
          and your business profile. Gemini does not browse live news: always verify holidays, festivals, and local events
          before you run paid campaigns.
        </p>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Your direction (optional)
          <textarea
            value={focusText}
            onChange={(e) => setFocusText(e.target.value.slice(0, 2000))}
            rows={3}
            placeholder="e.g. Diwali weekend sale 20% off, promote new vegan menu, B2B webinar next week, tone: playful…"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <p className="mt-1 text-xs text-muted">Up to 2,000 characters. Ideas will try to align with what you type.</p>
        <button
          type="button"
          disabled={loading}
          onClick={() => void generate()}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Generating…" : "Get today’s campaign ideas"}
        </button>
        {err ? <p className="mt-3 text-sm text-red-700">{err}</p> : null}
        {draftMsg ? <p className="mt-3 text-sm text-emerald-800">{draftMsg}</p> : null}
      </div>

      {meta ? (
        <p className="text-xs text-muted">
          Generated for {meta.weekday}, {meta.date} (IST calendar context).{" "}
          {new Date(meta.at).toLocaleString()}
        </p>
      ) : null}

      <ul className="space-y-4">
        {ideas.map((idea, i) => {
          const dk = idea.title + idea.hook;
          return (
            <li
              key={`${idea.title}-${i}`}
              className="rounded-2xl border border-violet-200/80 bg-violet-50/40 p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-900">
                    {idea.format} · {idea.trendOrOccasion}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">{idea.title}</h2>
                </div>
                {canCreateDraft ? (
                  <button
                    type="button"
                    disabled={draftingKey === dk}
                    onClick={() => void createDraft(idea)}
                    className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {draftingKey === dk ? "Creating…" : "Create draft in Social ads"}
                  </button>
                ) : null}
              </div>
              <p className="mt-2 text-sm font-medium text-slate-800">{idea.hook}</p>
              <p className="mt-2 text-sm text-slate-700">{idea.rationale}</p>
              {idea.suggestedHashtags ? (
                <p className="mt-3 font-mono text-xs text-slate-600">{idea.suggestedHashtags}</p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {!canCreateDraft && ideas.length > 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-muted">
          On <strong className="text-slate-800">Elite</strong>, each idea includes a button to generate full Meta copy and
          save it as <strong className="text-slate-800">today&apos;s draft</strong> under Social ads.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 text-sm">
        {canCreateDraft ? (
          <Link href="/dashboard/social" className="font-semibold text-accent hover:underline">
            Open Social ads →
          </Link>
        ) : null}
        <Link href="/dashboard" className="font-semibold text-accent hover:underline">
          ← Overview
        </Link>
      </div>
    </div>
  );
}
