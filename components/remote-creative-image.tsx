"use client";

import { useEffect, useState } from "react";

type Props = {
  src: string | null | undefined;
  /** If primary `src` fails (e.g. truncated data URL), load this next — usually rule-based `/images/blog/*.svg`. */
  fallbackSrc?: string | null;
  alt: string;
  className?: string;
  /** Shown when src is missing */
  emptyLabel?: string;
};

function isPollinationsCreativeUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === "gen.pollinations.ai" || h === "image.pollinations.ai";
  } catch {
    return false;
  }
}

/** Legacy Pollinations rows: server proxy when still using remote URL (prefer resolving to stock in `dashboard*Src`). */
function dashboardImageSrc(original: string): string {
  const t = original.trim();
  if (t.startsWith("data:")) return t;
  if (!isPollinationsCreativeUrl(t)) return t;
  return `/api/creative-image?u=${encodeURIComponent(t)}`;
}

export function RemoteCreativeImage({ src, fallbackSrc, alt, className, emptyLabel }: Props) {
  const primary = src?.trim() ?? "";
  const fallback = fallbackSrc?.trim() ?? "";
  const [active, setActive] = useState<"primary" | "fallback">("primary");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setActive("primary");
    setFailed(false);
  }, [primary, fallback]);

  if (!primary) {
    return emptyLabel ? (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{emptyLabel}</p>
    ) : null;
  }

  const rawChosen = active === "fallback" && fallback ? fallback : primary;
  const displaySrc = dashboardImageSrc(rawChosen);

  if (failed) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        <p className="font-medium">Image did not load.</p>
        <p className="mt-1 text-xs">
          Try refreshing. If this persists, run <code className="rounded bg-white/80 px-1">npm run backfill:images</code> to
          rewrite stored URLs to topic SVGs.
        </p>
        <a href={displaySrc} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-accent underline">
          Open image URL (new tab)
        </a>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displaySrc}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className}
      onError={() => {
        if (active === "primary" && fallback && fallback !== primary) {
          setActive("fallback");
        } else {
          setFailed(true);
        }
      }}
    />
  );
}
