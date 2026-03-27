/** Normalize model output: markdown fences, preamble, or outer JSON string. */

export function parseGeminiJsonObject(raw: string): Record<string, unknown> {
  let s = raw.trim();
  if (!s) throw new Error("Empty response from model");

  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();

  const tryParse = (chunk: string): Record<string, unknown> => {
    const parsed: unknown = JSON.parse(chunk);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Expected a JSON object");
    }
    return parsed as Record<string, unknown>;
  };

  try {
    return tryParse(s);
  } catch {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return tryParse(s.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
  }

  try {
    const outer = JSON.parse(s);
    if (typeof outer === "string") return tryParse(outer);
  } catch {
    /* fall through */
  }

  throw new Error("Model returned non-JSON");
}
