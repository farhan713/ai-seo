import { GoogleGenerativeAI } from "@google/generative-ai";
import type { IndustryVertical, MarketingGoal } from "@prisma/client";
import { presetGuidanceForBlog } from "@/lib/marketing-presets";

export type SocialPackResult = {
  linkedin: string;
  instagram: string;
  facebook: string;
};

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
}): Promise<SocialPackResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json" },
  });

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

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text) as Partial<SocialPackResult>;
  return {
    linkedin: needLi ? String(parsed.linkedin || "").slice(0, 4000) : "",
    instagram: needIg ? String(parsed.instagram || "").slice(0, 4000) : "",
    facebook: needFb ? String(parsed.facebook || "").slice(0, 4000) : "",
  };
}
