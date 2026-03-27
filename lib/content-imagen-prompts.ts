/** Build Imagen prompt from blog + meta + optional body excerpt (any industry). `gemini-imagen` finalizes length. */
export function buildBlogImagenPrompt(p: {
  title: string;
  summary: string;
  metaTitle: string;
  metaDescription: string;
  coverImagePrompt?: string | null;
  industry?: string | null;
  businessName?: string | null;
  /** Plain text from article body so the visual matches what the post actually says */
  bodyExcerpt?: string | null;
}): string {
  const excerpt = (p.bodyExcerpt || "").replace(/\s+/g, " ").trim().slice(0, 520);
  const base =
    p.coverImagePrompt && p.coverImagePrompt.trim().length >= 35
      ? p.coverImagePrompt.trim()
      : [
          "Wide 16:9 editorial hero photograph for a professional blog article.",
          `Title: ${p.title}.`,
          `Summary: ${p.summary.slice(0, 520)}.`,
          `Meta title: ${p.metaTitle}.`,
          p.metaDescription ? `Meta description: ${p.metaDescription.slice(0, 260)}.` : "",
          p.businessName ? `Company: ${p.businessName}.` : "",
          p.industry ? `Industry: ${p.industry}.` : "",
        ]
          .filter(Boolean)
          .join(" ");
  if (excerpt.length > 50) {
    return `${base} Article body themes and concrete details to reflect visually: ${excerpt}`;
  }
  return base;
}

const CREATIVE_MARKER = "━━ CREATIVE";

/** Uses the CREATIVE section from the ad pack, else caption + brand context. */
export function buildSocialImagenPrompt(
  caption: string,
  extra?: { industry?: string | null; businessName?: string | null }
): string {
  let core = "";
  const idx = caption.indexOf(CREATIVE_MARKER);
  if (idx !== -1) {
    const after = caption.slice(idx);
    const lines = after.split("\n");
    core = lines.slice(1).join("\n").trim();
  }
  if (core.length < 50) {
    core = [
      "Square 1:1 premium paid social feed photograph.",
      caption.slice(0, 900),
      extra?.businessName ? `Brand: ${extra.businessName}.` : "",
      extra?.industry ? `Industry: ${extra.industry}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }
  return core;
}
