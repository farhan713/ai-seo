import { blockText, parseBlogBody } from "@/lib/blog-blocks";

/** Plain-text excerpt from blog JSON body for Gemini prompts. */
export function blogBodyExcerptForPrompt(body: unknown, max = 1200): string {
  const blocks = parseBlogBody(body);
  const parts: string[] = [];
  for (const b of blocks) {
    if (parts.join(" ").length > max) break;
    if (b.type === "ul") parts.push((b.content || []).join(" "));
    else parts.push(blockText(b));
  }
  return parts.join("\n").slice(0, max);
}
