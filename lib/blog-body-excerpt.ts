import { blockText, parseBlogBody } from "@/lib/blog-blocks";

/** Flatten first blocks into plain text for image prompts (industry-agnostic). */
export function blogBodyExcerptForImagen(body: unknown, maxChars = 700): string {
  const blocks = parseBlogBody(body);
  const parts: string[] = [];
  for (const b of blocks) {
    if (parts.join(" ").length >= maxChars) break;
    if (b.type === "ul") {
      for (const li of (b.content || []).slice(0, 6)) {
        if (parts.join(" ").length >= maxChars) break;
        parts.push(li);
      }
    } else {
      const t = blockText(b);
      if (t) parts.push(t);
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, maxChars);
}
