/** Map Google Generative AI / Gemini SDK errors to HTTP status and short UI copy. */

export function httpStatusForGeminiError(raw: string): number {
  if (/429|Too Many Requests|RESOURCE_EXHAUSTED|quota|Quota exceeded/i.test(raw)) return 429;
  if (/503|UNAVAILABLE|overloaded/i.test(raw)) return 503;
  if (/401|403|API key|API_KEY_INVALID|invalid.*key/i.test(raw)) return 502;
  return 502;
}

export function userFacingMessageFromGeminiError(raw: string): string {
  if (/429|Too Many Requests|RESOURCE_EXHAUSTED|quota|Quota exceeded/i.test(raw)) {
    return (
      "Gemini rate limit or free-tier quota reached. Wait 1–2 minutes and try again, enable billing in Google AI Studio, " +
      "or add your Gemini API key under Business profile (BYOK) so requests use your own quota."
    );
  }
  if (/503|UNAVAILABLE|overloaded/i.test(raw)) {
    return "Gemini is temporarily overloaded. Try again in a minute.";
  }
  if (/401|403|API key|API_KEY_INVALID|invalid.*key/i.test(raw)) {
    return "Gemini API key was rejected. Check the server GEMINI_API_KEY or your key in Business profile.";
  }
  if (raw.length > 400) return `${raw.slice(0, 400)}…`;
  return raw;
}

/** Parse "retry in 44.36s" or JSON retryDelay from Google error bodies. */
export function parseGeminiRetryDelayMs(message: string): number | null {
  const inline = message.match(/retry in ([\d.]+)\s*s/i);
  if (inline) {
    const sec = Math.min(120, Math.ceil(Number(inline[1])));
    if (sec > 0) return sec * 1000;
  }
  const quoted = message.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (quoted) {
    const sec = Math.min(120, parseInt(quoted[1], 10));
    if (sec > 0) return sec * 1000;
  }
  return null;
}
