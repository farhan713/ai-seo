export type BlogBlock =
  | { type: "h2"; text?: string; content?: string }
  | { type: "p"; text?: string; content?: string }
  | { type: "ul"; content: string[] }
  | { type: "callout"; text?: string; content?: string };

export function blockText(b: BlogBlock): string {
  if (b.type === "ul") return "";
  return ("text" in b && b.text) || ("content" in b && typeof b.content === "string" ? b.content : "") || "";
}

export function blocksToHtml(blocks: BlogBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "h2":
        parts.push(`<h2>${escapeHtml(blockText(b))}</h2>`);
        break;
      case "p":
        parts.push(`<p>${escapeHtml(blockText(b))}</p>`);
        break;
      case "ul": {
        const items = (b.content || []).map((li) => `<li>${escapeHtml(li)}</li>`).join("");
        parts.push(`<ul>${items}</ul>`);
        break;
      }
      case "callout":
        parts.push(
          `<aside class="blog-callout">${escapeHtml(blockText(b))}</aside>`
        );
        break;
      default:
        break;
    }
  }
  return parts.join("\n");
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function parseBlogBody(raw: unknown): BlogBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x && typeof x === "object" && "type" in x) as BlogBlock[];
}
