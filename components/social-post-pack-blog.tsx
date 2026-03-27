"use client";

import { useState } from "react";

export function SocialPostPackBlog({ blogId }: { blogId: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pack, setPack] = useState<{
    linkedin: string | null;
    instagram: string | null;
    facebook: string | null;
  } | null>(null);

  async function generate() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/social-post-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed");
      setPack({
        linkedin: body.linkedin ?? null,
        instagram: body.instagram ?? null,
        facebook: body.facebook ?? null,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Social post pack</h2>
      <p className="mt-1 text-xs text-muted">
        Platform-specific captions (Growth/Elite). Copy and paste into LinkedIn, Instagram, or Facebook.
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={() => void generate()}
        className="mt-3 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
      >
        {loading ? "Generating…" : "Generate from this blog"}
      </button>
      {err ? <p className="mt-2 text-sm text-red-800">{err}</p> : null}
      {pack ? (
        <div className="mt-4 space-y-4">
          {pack.linkedin ? (
            <CopyBlock label="LinkedIn" text={pack.linkedin} />
          ) : null}
          {pack.instagram ? (
            <CopyBlock label="Instagram" text={pack.instagram} />
          ) : null}
          {pack.facebook ? <CopyBlock label="Facebook" text={pack.facebook} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase text-slate-600">{label}</span>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          }}
          className="text-xs font-semibold text-violet-700 hover:underline"
        >
          {done ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{text}</p>
    </div>
  );
}
