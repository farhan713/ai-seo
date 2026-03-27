"use client";

/**
 * Hover/focus hint with numbered steps (client keys, integrations).
 */
export function FieldTooltip({ label, steps }: { label: string; steps: string[] }) {
  return (
    <span className="group relative ml-1 inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 focus-within:ring-2 focus-within:ring-primary/30">
      <span tabIndex={0} className="outline-none">
        ?
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-normal leading-snug text-slate-700 shadow-lg group-hover:block group-focus-within:block"
      >
        <strong className="mb-1 block text-slate-900">{label}</strong>
        <ol className="mt-2 list-decimal space-y-1.5 pl-4">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </span>
    </span>
  );
}
