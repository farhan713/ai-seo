"use client";

import { useState } from "react";
import type { GrowthScoreResult } from "@/lib/growth-score";

export function GrowthScoreCard({ model }: { model: GrowthScoreResult | null }) {
  const [open, setOpen] = useState(false);
  if (!model) return null;

  return (
    <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/90 to-cyan-50/50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-900">Unified growth score</p>
          <p className="mt-1 text-sm text-slate-700">One number from audits, lab SEO, momentum, and execution (formula v{model.version}).</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black tabular-nums text-teal-950">{model.total}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-teal-800">out of 100</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-4 text-sm font-semibold text-teal-800 hover:underline"
      >
        {open ? "Hide breakdown" : "Why this score?"}
      </button>
      {open ? (
        <ul className="mt-3 space-y-2 border-t border-teal-200/60 pt-3 text-sm text-slate-800">
          {model.bands.map((b) => (
            <li key={b.id} className="rounded-lg bg-white/70 px-3 py-2">
              <span className="font-semibold text-slate-900">{b.label}</span>
              <span className="tabular-nums text-muted">
                {" "}
                · {b.maxPoints > 0 ? `${b.points.toFixed(1)} / ${b.maxPoints} pts` : `${b.points.toFixed(1)} pts`}
              </span>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{b.detail}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
