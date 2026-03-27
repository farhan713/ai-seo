import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { User } from "@prisma/client";

export type TrendCampaignIdea = {
  title: string;
  hook: string;
  format: "reel" | "post" | "carousel" | "story" | "other";
  rationale: string;
  trendOrOccasion: string;
  suggestedHashtags: string;
};

function normalizeFormat(v: string): TrendCampaignIdea["format"] {
  const x = v.toLowerCase().trim();
  if (x === "reel" || x === "post" || x === "carousel" || x === "story") return x;
  return "other";
}

const MAX_FOCUS_LEN = 2000;

/** Structured output — reduces markdown / prose around JSON (especially with mixed model versions). */
const CAMPAIGN_IDEAS_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  required: ["ideas"],
  properties: {
    ideas: {
      type: SchemaType.ARRAY,
      minItems: 2,
      maxItems: 6,
      items: {
        type: SchemaType.OBJECT,
        required: [
          "title",
          "hook",
          "format",
          "rationale",
          "trendOrOccasion",
          "suggestedHashtags",
        ],
        properties: {
          title: { type: SchemaType.STRING },
          hook: { type: SchemaType.STRING },
          format: { type: SchemaType.STRING },
          rationale: { type: SchemaType.STRING },
          trendOrOccasion: { type: SchemaType.STRING },
          suggestedHashtags: { type: SchemaType.STRING },
        },
      },
    },
  },
} as const;

/**
 * Gemini often returns valid JSON but wrapped in ```json fences, or with a short preamble.
 * responseMimeType: application/json is not always honored across models/SDK versions.
 */
function parseCampaignIdeasResponse(raw: string): Record<string, unknown> {
  let s = raw.trim();
  if (!s) throw new Error("Gemini returned empty response for campaign ideas");

  // Markdown code block (may be embedded after a short preamble)
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();

  const tryParse = (chunk: string): Record<string, unknown> => {
    const parsed: unknown = JSON.parse(chunk);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Expected a JSON object with an ideas array");
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
        // ignore; try double-encoded JSON string below
      }
    }
  }

  // Model occasionally returns a JSON string that contains the object (quoted JSON)
  try {
    const outer = JSON.parse(s.trim());
    if (typeof outer === "string") {
      return tryParse(outer);
    }
  } catch {
    /* fall through */
  }

  throw new Error("Gemini returned non-JSON for campaign ideas");
}

export async function generateTrendCampaignIdeas(input: {
  user: Pick<User, "businessName" | "businessUrl" | "businessDescription" | "industry" | "industryVertical" | "marketingGoal">;
  calendarDateLabel: string;
  weekdayName: string;
  geminiApiKey?: string | null;
  /** Optional client notes: sale, festival, product launch, audience, tone, etc. */
  optionalFocus?: string | null;
  /** Dev/probe: inspect raw model text before JSON parse */
  onRawResponse?: (text: string) => void;
}): Promise<TrendCampaignIdea[]> {
  const apiKey = input.geminiApiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set and no client Gemini key provided");

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);

  const focusRaw = input.optionalFocus?.trim() ?? "";
  const focusBlock =
    focusRaw.length > 0
      ? `\nClient direction (must weigh heavily; align every idea with this where sensible):\n${focusRaw.slice(0, MAX_FOCUS_LEN)}\n`
      : "";

  const prompt = `You are a senior paid social strategist for Meta (Facebook and Instagram).

Task: Propose concrete content campaign ideas for TODAY so the client can film or design posts and reels.

Important constraints:
- You do NOT have live internet. Use the calendar date and weekday given, plus widely known seasonal patterns, typical holidays and festivals for India and global audiences where relevant, and evergreen marketing moments (month start, weekend, back-to-school season windows, etc.). Be explicit when something is approximate and tell the client to verify dates and local news before spending ad budget.
- Every idea must fit THIS business (not generic filler).

Calendar context:
- Date: ${input.calendarDateLabel}
- Weekday: ${input.weekdayName}
${focusBlock}
Business profile:
- Name: ${input.user.businessName || "Client"}
- Website: ${input.user.businessUrl || "n/a"}
- Description: ${input.user.businessDescription || "n/a"}
- Industry (text): ${input.user.industry || "n/a"}
- Industry vertical preset: ${input.user.industryVertical}
- Marketing goal preset: ${input.user.marketingGoal}

Return JSON only with this exact shape:
{
  "ideas": [
    {
      "title": "short campaign name",
      "hook": "one-line creative hook or angle",
      "format": "reel" | "post" | "carousel" | "story" | "other",
      "rationale": "2-4 sentences: why this fits the date/trend and this business",
      "trendOrOccasion": "what calendar moment or trend this ties to (be honest if estimated)",
      "suggestedHashtags": "space-separated hashtags with #, 5-12 tags"
    }
  ]
}

Rules:
- Provide exactly 4 ideas in the array.
- Mix formats where natural (include at least one reel-style idea when it suits the business).
- No em dashes. Straight ASCII apostrophes.
- Ideas must be safe and professional (no controversial bait, no unverified claims).`;

  const schemaRejected = (msg: string) =>
    /responseSchema|response_schema|JSON schema|generationConfig|invalid value.*schema|unsupported.*schema/i.test(msg);

  let text = "";
  let useResponseSchema = true;
  outer: while (true) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: useResponseSchema
        ? {
            responseMimeType: "application/json",
            responseSchema: CAMPAIGN_IDEAS_RESPONSE_SCHEMA,
          }
        : { responseMimeType: "application/json" },
    });
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        text = result.response.text();
        input.onRawResponse?.(text);
        break outer;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (useResponseSchema && schemaRejected(msg)) {
          useResponseSchema = false;
          continue outer;
        }
        const retryable = msg.includes("503") || msg.includes("429") || msg.includes("UNAVAILABLE");
        if (!retryable || attempt === 4) throw e;
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }

  const o = parseCampaignIdeasResponse(text);
  const raw = o.ideas;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("Invalid campaign ideas payload");
  }

  const ideas: TrendCampaignIdea[] = [];
  for (const item of raw.slice(0, 6)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const title = String(r.title || "").trim();
    const hook = String(r.hook || "").trim();
    const rationale = String(r.rationale || "").trim();
    if (!title || !hook || !rationale) continue;
    ideas.push({
      title,
      hook,
      format: normalizeFormat(String(r.format || "post")),
      rationale,
      trendOrOccasion: String(r.trendOrOccasion || "").trim() || "General timing",
      suggestedHashtags: String(r.suggestedHashtags || "").trim(),
    });
  }

  if (ideas.length < 2) {
    throw new Error("Model returned too few usable ideas");
  }

  return ideas.slice(0, 4);
}

export function buildCampaignIdeaAdContext(idea: TrendCampaignIdea): string {
  return [
    "Use this approved campaign idea as the single creative brief for Meta ads.",
    `Title: ${idea.title}`,
    `Hook: ${idea.hook}`,
    `Recommended format: ${idea.format}`,
    `Trend or occasion: ${idea.trendOrOccasion}`,
    `Strategic rationale: ${idea.rationale}`,
    idea.suggestedHashtags ? `Hashtag direction: ${idea.suggestedHashtags}` : "",
    "Deliver a cohesive Instagram caption and Facebook primary text that execute this idea.",
  ]
    .filter(Boolean)
    .join("\n");
}
