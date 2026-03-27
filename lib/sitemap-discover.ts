import { normalizeWebsiteUrl } from "@/lib/url-normalize";

const UA =
  "Mozilla/5.0 (compatible; SEOContentCrawl/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const FETCH_MS = 12_000;
const MAX_SITEMAP_FILES = 10;

function parseSitemapContent(xml: string): { pageUrls: string[]; childSitemaps: string[] } {
  const pageUrls: string[] = [];
  const childSitemaps: string[] = [];
  for (const m of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
    const raw = m[1].trim();
    if (!raw.startsWith("http")) continue;
    if (/\.xml(\?|#|$)/i.test(raw)) childSitemaps.push(raw);
    else pageUrls.push(raw);
  }
  return { pageUrls, childSitemaps };
}

function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

/** Sitemap-based URL list, capped. Always includes normalized homepage. */
export async function discoverCrawlUrls(siteUrl: string, max: number): Promise<string[]> {
  const base = normalizeWebsiteUrl(siteUrl);
  const origin = new URL(base).origin;
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (u: string) => {
    try {
      const n = new URL(u).href.replace(/\/$/, "") || u;
      if (!sameOrigin(n, base)) return;
      if (seen.has(n)) return;
      seen.add(n);
      out.push(new URL(u).href);
    } catch {
      /* skip */
    }
  };

  add(base);

  const queue: string[] = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap_index.xml.gz`,
    `${origin}/wp-sitemap.xml`,
  ];
  const fetchedSitemaps = new Set<string>();

  async function fetchXml(url: string): Promise<string | null> {
    if (fetchedSitemaps.has(url) || fetchedSitemaps.size >= MAX_SITEMAP_FILES) return null;
    fetchedSitemaps.add(url);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_MS);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        cache: "no-store",
        headers: { Accept: "application/xml,text/xml,*/*", "User-Agent": UA },
      });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  }

  while (queue.length > 0 && fetchedSitemaps.size < MAX_SITEMAP_FILES && out.length < max + 20) {
    const smUrl = queue.shift()!;
    const xml = await fetchXml(smUrl);
    if (!xml) continue;
    const { pageUrls, childSitemaps } = parseSitemapContent(xml);
    for (const c of childSitemaps) {
      if (sameOrigin(c, base) && !fetchedSitemaps.has(c)) queue.push(c);
    }
    for (const p of pageUrls) add(p);
  }

  return out.slice(0, Math.max(1, max));
}
