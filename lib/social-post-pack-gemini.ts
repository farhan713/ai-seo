import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import type { IndustryVertical, MarketingGoal } from "@prisma/client";
import { parseGeminiRetryDelayMs } from "@/lib/gemini-http";
import { parseGeminiJsonObject } from "@/lib/parse-gemini-json";
import { presetGuidanceForBlog } from "@/lib/marketing-presets";

export type SocialPackResult = {
  linkedin: string;
  instagram: string;
  facebook: string;
};

const SOCIAL_PACK_SCHEMA = {
  type: SchemaType.OBJECT,
  required: ["linkedin", "instagram", "facebook"] as string[],
  properties: {
    linkedin: { type: SchemaType.STRING },
    instagram: { type: SchemaType.STRING },
    facebook: { type: SchemaType.STRING },
  },
} as Schema;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function generateSocialPostPack(input: {
  businessName?: string | null;
  industry?: string | null;
  industryVertical?: IndustryVertical | null;
  marketingGoal?: MarketingGoal | null;
  sourceLabel: string;
  title: string;
  summary: string;
  bodyExcerpt: string;
  platforms: ("linkedin" | "instagram" | "facebook")[];
  /** Optional BYOK; falls back to GEMINI_API_KEY */
  geminiApiKey?: string | null;
}): Promise<SocialPackResult> {
  const apiKey = input.geminiApiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set and no client Gemini key provided");
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);

  const vertical = input.industryVertical ?? "GENERAL";
  const goal = input.marketingGoal ?? "OTHER";
  const preset = presetGuidanceForBlog(vertical, goal);

  const needLi = input.platforms.includes("linkedin");
  const needIg = input.platforms.includes("instagram");
  const needFb = input.platforms.includes("facebook");

  const prompt = `You write short social captions to promote web content. ${preset}

Business: ${input.businessName || "Client"}
Industry: ${input.industry || "General"}
Source: ${input.sourceLabel}

Title: ${input.title}
Summary: ${input.summary}
Excerpt: ${input.bodyExcerpt.slice(0, 2500)}

Rules:
- Straight ASCII apostrophes. No em dashes.
- linkedin: professional, 2-4 short paragraphs or bullet feel, optional 3-5 hashtags at end. Max ~2200 chars.
- instagram: hook line, body, clear CTA, 8-12 relevant hashtags on new lines. Max ~2200 chars.
- facebook: friendly, conversational, one clear CTA. Max ~1500 chars.
- If a platform is not requested, return empty string for that key.

Return JSON only:
{
  "linkedin": "",
  "instagram": "",
  "facebook": ""
}

Requested platforms: ${needLi ? "linkedin " : ""}${needIg ? "instagram " : ""}${needFb ? "facebook" : ""}`;

  const schemaRejected = (msg: string) =>
    /responseSchema|response_schema|JSON schema|generationConfig|unsupported.*schema/i.test(msg);

  let useSchema = true;
  let text = "";

  outer: while (true) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: useSchema
        ? {
            responseMimeType: "application/json" as const,
            responseSchema: SOCIAL_PACK_SCHEMA,
          }
        : { responseMimeType: "application/json" as const },
    });

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        text = result.response.text();
        break outer;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (useSchema && schemaRejected(msg)) {
          useSchema = false;
          continue outer;
        }
        const retryable =
          msg.includes("429") ||
          msg.includes("503") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("Too Many Requests") ||
          msg.includes("RESOURCE_EXHAUSTED");
        if (retryable && attempt < 5) {
          const delay = parseGeminiRetryDelayMs(msg) ?? 1500 * attempt;
          await sleep(delay);
          continue;
        }
        throw e;
      }
    }
  }

  const parsed = parseGeminiJsonObject(text);
  return {
    linkedin: needLi ? String(parsed.linkedin || "").slice(0, 4000) : "",
    instagram: needIg ? String(parsed.instagram || "").slice(0, 4000) : "",
    facebook: needFb ? String(parsed.facebook || "").slice(0, 4000) : "",
  };
}
