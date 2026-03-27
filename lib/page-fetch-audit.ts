/**
 * Lightweight live fetch of the audited URL so the model sees real title, meta, and H1s.
 * Free PageSpeed does not give you this copy in one workflow with AI rewrites.
 */

const MAX_HTML_BYTES = 400_000;
const FETCH_MS = 14_000;

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export type PageSignals = {
  ok: boolean;
  statusCode?: number;
  finalUrl?: string;
  title?: string;
  metaDescription?: string;
  h1Texts: string[];
  canonicalHref?: string;
  ogTitle?: string;
  ogDescription?: string;
  fetchError?: string;
};

export async function fetchPageSignalsForAudit(pageUrl: string): Promise<PageSignals> {
  const empty: PageSignals = { ok: false, h1Texts: [] };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(pageUrl, {
      signal: ctrl.signal,
      redirect: "follow",
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; SEOContentAudit/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);

    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const metaDesc =
      html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1] ||
      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i)?.[1];
    const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1];
    const ogDescription =
      html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1];

    const h1Texts: string[] = [];
    const re = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null && h1Texts.length < 6) {
      const text = stripTags(m[1] || "");
      if (text) h1Texts.push(text.slice(0, 200));
    }

    return {
      ok: res.ok,
      statusCode: res.status,
      finalUrl: res.url,
      title: title ? stripTags(title).slice(0, 200) : undefined,
      metaDescription: metaDesc ? stripTags(metaDesc).slice(0, 320) : undefined,
      h1Texts,
      canonicalHref: canonical?.trim(),
      ogTitle: ogTitle ? stripTags(ogTitle).slice(0, 200) : undefined,
      ogDescription: ogDescription ? stripTags(ogDescription).slice(0, 320) : undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return { ...empty, fetchError: msg };
  } finally {
    clearTimeout(t);
  }
}

export function formatPageSignalsForPrompt(label: string, s: PageSignals): string {
  if (s.fetchError) {
    return `${label}: fetch failed (${s.fetchError}). Infer cautiously from URL only.\n`;
  }
  const lines = [
    `${label} HTTP ${s.statusCode ?? "?"} final ${s.finalUrl || "unknown"}`,
    s.title ? `title: ${s.title}` : "title: (missing or unreadable)",
    s.metaDescription ? `meta description: ${s.metaDescription}` : "meta description: (missing)",
    s.canonicalHref ? `canonical: ${s.canonicalHref}` : "canonical: (not seen in first HTML chunk)",
    s.ogTitle ? `og:title: ${s.ogTitle}` : "",
    s.ogDescription ? `og:description: ${s.ogDescription}` : "",
    s.h1Texts.length ? `H1s: ${s.h1Texts.map((h) => `"${h}"`).join(" | ")}` : "H1s: (none parsed in first HTML chunk)",
  ].filter(Boolean);
  return `${lines.join("\n")}\n`;
}
