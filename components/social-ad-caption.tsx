"use client";

/** Renders multi-section ad copy (━━ headers) with readable hierarchy. */
export function SocialAdCaption({ text }: { text: string }) {
  const chunks = text.split(/\n(?=━━)/g).map((c) => c.trim()).filter(Boolean);
  if (chunks.length <= 1) {
    return <p className="whitespace-pre-wrap text-slate-800">{text}</p>;
  }
  return (
    <div className="space-y-4">
      {chunks.map((chunk, i) => {
        const lines = chunk.split("\n");
        const head = lines[0];
        const body = lines.slice(1).join("\n").trim();
        return (
          <div key={i} className="rounded-lg border border-slate-100 bg-white/90 p-3 shadow-sm">
            <h3 className="text-xs font-semibold text-primary">{head}</h3>
            {body ? <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{body}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
