import { normalizeTrackedPhrase } from "@/lib/tracked-keywords-bootstrap";

export type GscRowLite = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

function norm(s: string): string {
  return normalizeTrackedPhrase(s).toLowerCase();
}

/** Best matching GSC row for a tracked phrase (exact → substring → highest clicks partial). */
export function matchGscRowForPhrase(phrase: string, rows: GscRowLite[]): (GscRowLite & { matchedQuery: string }) | null {
  if (!rows.length) return null;
  const n = norm(phrase);
  if (!n) return null;

  const normalizedRows = rows.map((r) => ({ r, q: norm(r.query) })).filter((x) => x.q.length > 0);

  const exact = normalizedRows.find((x) => x.q === n);
  if (exact) return { ...exact.r, matchedQuery: exact.r.query };

  const contains = normalizedRows.filter(
    (x) => x.q.includes(n) || n.includes(x.q)
  );
  if (contains.length > 0) {
    contains.sort((a, b) => b.r.clicks - a.r.clicks || b.r.impressions - a.r.impressions);
    return { ...contains[0].r, matchedQuery: contains[0].r.query };
  }

  const phraseTokens = n.split(/\s+/).filter((t) => t.length > 2);
  if (phraseTokens.length === 0) return null;

  let best: { r: GscRowLite; score: number } | null = null;
  for (const { r, q } of normalizedRows) {
    const hit = phraseTokens.filter((t) => q.includes(t)).length;
    if (hit === 0) continue;
    const score = hit * 1000 + r.clicks;
    if (!best || score > best.score) best = { r, score };
  }
  if (best) return { ...best.r, matchedQuery: best.r.query };

  return null;
}
