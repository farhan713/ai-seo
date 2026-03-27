import { pickBlogHeroPath, pickSocialStockPath } from "@/lib/stock-creative-images";

function isPollinationsUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === "gen.pollinations.ai" || h === "image.pollinations.ai";
  } catch {
    return false;
  }
}

/**
 * Dashboard / export: use rule-based SVG when the DB still has legacy Pollinations or empty URLs,
 * so covers always resolve without proxy keys or generative billing.
 */
export function dashboardBlogCoverSrc(
  stored: string | null | undefined,
  title: string,
  slug: string,
  industry?: string | null
): string {
  const stock = pickBlogHeroPath(title, slug, industry);
  const s = stored?.trim() ?? "";
  if (!s) return stock;
  if (s.startsWith("/images/blog/")) return s;
  if (s.startsWith("data:image/")) return s;
  if (isPollinationsUrl(s)) return stock;
  if (s.startsWith("/")) return s;
  try {
    new URL(s);
    return s;
  } catch {
    return stock;
  }
}

export function dashboardSocialImageSrc(
  stored: string | null | undefined,
  caption: string,
  dateKey: string,
  extra?: { industry?: string | null; businessName?: string | null }
): string {
  const stock = pickSocialStockPath(caption, dateKey, extra);
  const s = stored?.trim() ?? "";
  if (!s) return stock;
  if (s.startsWith("/images/blog/")) return s;
  if (s.startsWith("data:image/")) return s;
  if (isPollinationsUrl(s)) return stock;
  if (s.startsWith("/")) return s;
  try {
    new URL(s);
    return s;
  } catch {
    return stock;
  }
}
