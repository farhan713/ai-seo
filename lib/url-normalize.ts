/** Ensure absolute http(s) URL for audits and external APIs. */
export function normalizeWebsiteUrl(raw: string): string {
  const u = raw.trim();
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}
