/**
 * Default: rule-based topic art only (`pickBlogHeroPath` / `pickSocialStockPath`) — no generative image API, no billing.
 * Opt in: set BLOG_COVER_MODE=imagen (and optionally SOCIAL_IMAGE_MODE=imagen) to try Imagen with SVG fallback on failure.
 */
const DEFAULT = "stock";

function norm(v: string | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

function isImagenOptIn(raw: string): boolean {
  return raw === "imagen" || raw === "ai" || raw === "generate";
}

/** True unless BLOG_COVER_MODE is explicitly imagen|ai|generate. */
export function blogCoverUsesStockOnly(): boolean {
  const v = norm(process.env.BLOG_COVER_MODE) || DEFAULT;
  return !isImagenOptIn(v);
}

/** True unless SOCIAL_IMAGE_MODE or (if unset) BLOG_COVER_MODE opts into Imagen. */
export function socialImageUsesStockOnly(): boolean {
  const ex = norm(process.env.SOCIAL_IMAGE_MODE);
  if (ex) return !isImagenOptIn(ex);
  const inherited = norm(process.env.BLOG_COVER_MODE) || DEFAULT;
  return !isImagenOptIn(inherited);
}
