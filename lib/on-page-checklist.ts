import { gscQueryKey } from "@/lib/gsc-query-key";
import { normalizeWebsiteUrl } from "@/lib/url-normalize";

export type ChecklistTask = { id: string; label: string; category: string; done: boolean };

export function checklistUrlKey(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return gscQueryKey("");
  try {
    const u = new URL(normalizeWebsiteUrl(trimmed));
    const path = u.pathname.replace(/\/+$/, "") || "/";
    const key = `${u.hostname.toLowerCase()}${path}`;
    return gscQueryKey(key);
  } catch {
    return gscQueryKey(trimmed.toLowerCase());
  }
}

export function defaultChecklistTasks(): ChecklistTask[] {
  return [
    { id: "title-meta", label: "Page title is descriptive and roughly under 60 characters", category: "Meta", done: false },
    { id: "meta-desc", label: "Meta description present (about 140–155 characters)", category: "Meta", done: false },
    { id: "h1-single", label: "One clear H1 that matches page intent", category: "Headings", done: false },
    { id: "schema", label: "Relevant structured data (JSON-LD) where applicable", category: "Schema", done: false },
    { id: "speed", label: "Core Web Vitals / lab performance acceptable for key templates", category: "Performance", done: false },
    { id: "internal-links", label: "Internal links to related services or pillar pages", category: "Links", done: false },
    { id: "mobile-cta", label: "Primary CTA visible without excessive scrolling on mobile", category: "Conversion", done: false },
    { id: "trust", label: "Trust signals (reviews, logos, certifications) where appropriate", category: "Conversion", done: false },
  ];
}

type FindingLite = { area: string; detail: string; suggestion: string };

/** Light heuristic: align checklist emphasis with audit findings text. */
export function applyFindingHints(tasks: ChecklistTask[], findings: FindingLite[]): ChecklistTask[] {
  const blob = findings.map((f) => `${f.area} ${f.detail} ${f.suggestion}`).join(" ").toLowerCase();
  return tasks.map((t) => {
    if (t.id === "h1-single" && (blob.includes("h1") || blob.includes("heading")) && (blob.includes("missing") || blob.includes("no ") || blob.includes("multiple"))) {
      return { ...t, done: false };
    }
    if (t.id === "title-meta" && blob.includes("title") && (blob.includes("missing") || blob.includes("too long") || blob.includes("duplicate"))) {
      return { ...t, done: false };
    }
    if (t.id === "meta-desc" && blob.includes("meta") && blob.includes("description") && (blob.includes("missing") || blob.includes("too short"))) {
      return { ...t, done: false };
    }
    return { ...t };
  });
}

export function parseTasksJson(raw: unknown): ChecklistTask[] | null {
  if (!raw || typeof raw !== "object") return null;
  const arr = (raw as { tasks?: unknown }).tasks;
  if (!Array.isArray(arr)) return null;
  const out: ChecklistTask[] = [];
  for (const x of arr) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const label = typeof o.label === "string" ? o.label : "";
    const category = typeof o.category === "string" ? o.category : "General";
    const done = o.done === true;
    if (id && label) out.push({ id, label, category, done });
  }
  return out.length > 0 ? out : null;
}
