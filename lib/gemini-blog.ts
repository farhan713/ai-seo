import { GoogleGenerativeAI } from "@google/generative-ai";
import type { User } from "@prisma/client";
import type { BlogBlock } from "./blog-blocks";
import { presetGuidanceForBlog } from "@/lib/marketing-presets";

function formatInternalLinks(links: unknown): string {
  if (!Array.isArray(links)) return "None provided.";
  const rows = links
    .filter((x) => x && typeof x === "object" && "url" in x && "anchor" in x)
    .map((x) => {
      const l = x as { url: string; anchor: string };
      return `- Anchor: "${l.anchor}" → ${l.url}`;
    });
  return rows.length ? rows.join("\n") : "None provided.";
}

export function buildBlogGenerationPrompt(user: User): string {
  const keywords = user.targetKeywords?.trim() || "general local and industry terms";
  const internal = formatInternalLinks(user.internalLinks);
  const presetTail = presetGuidanceForBlog(user.industryVertical ?? "GENERAL", user.marketingGoal ?? "OTHER");

  return `You are one combined expert: (1) a lead brand and digital designer with 15 years delivering editorial, campaign, and site heroes for agencies and premium clients, and (2) a principal SEO and web analytics lead with 20 years tying content to search intent, funnels, and measurable outcomes. Every line should sound credible to both a creative director and a data-driven marketing lead.

Write one complete blog post for this business.

Business name: ${user.businessName || "the business"}
Industry: ${user.industry || "general"}
Website: ${user.businessUrl || "not specified"}
About the business:
${user.businessDescription || "No extra description provided."}

Target keywords (weave in naturally, do not stuff): ${keywords}

Internal links to use naturally in the body where relevant (HTML will be built separately, just reference the pages in prose and note which anchor fits):
${internal}

Writing rules (strict):
- Conversational, helpful tone. Write like you are talking to a smart friend.
- Do not use em dashes (—) anywhere. Use commas or periods instead.
- Do not use semicolons. Split into separate sentences.
- No robotic filler. Be specific to this business and industry. Use concrete examples, numbers, or scenarios where they fit (analytics-minded, not vague thought leadership).
- Structure the article with clear h2 sections, bullet lists where useful, and one callout box with a practical tip or warning.
- Length: roughly 900 to 1400 words of readable body text across all blocks.

Meta tags must be agency-grade for CTR in Google (analytics lead standard):
- metaTitle: 50 to 60 characters, primary keyword in the first 35 characters, one clear benefit or number, no stuffing, no duplicate pipes.
- metaDescription: 140 to 155 characters, active voice, one specific promise, soft CTA (e.g. Learn how, See examples), no ellipses spam.

Hero visual brief (designer-owned, 15-year bar):
- The app shows a topic stock placeholder under /images/blog. You still output coverImagePrompt as if the client will brief a photographer or 3D artist.
- coverImagePrompt: one paragraph, 80 to 150 words. Write as a shoot-ready brief: hero concept tied to the article angle, subject and environment, wardrobe or materials, light direction and quality, lens and depth of field, color grade and mood, composition and negative space for headline safe zones. Call out what to avoid (cliché stock poses, generic office tropes) unless they truly fit the brand. Explicit: no text, logos, or watermarks in frame. Use photoreal or refined CGI only if it matches the industry (e.g. WebGL or product tech can justify premium 3D).

Output format: respond with JSON only, no markdown fences. Use this exact shape:
{
  "title": "string",
  "slug": "lowercase-kebab-case-slug",
  "summary": "one paragraph teaser under 220 characters",
  "metaTitle": "50-60 chars, keyword-forward, benefit-led",
  "metaDescription": "140-155 chars, compelling CTR-focused",
  "coverImagePrompt": "string, long visual description as specified",
  "body": [
    { "type": "h2", "text": "Section heading" },
    { "type": "p", "text": "Paragraph..." },
    { "type": "ul", "content": ["bullet one", "bullet two"] },
    { "type": "callout", "text": "Short tip or note in a highlighted box." }
  ]
}

The body array must alternate sections logically: start after title with an intro p, then h2/p patterns, include at least two h2 sections, at least one ul, and exactly one callout. Every block must use the types h2, p, ul, or callout only. For p and h2 and callout use the property "text" for the string content.${presetTail}`;
}

export type GeneratedBlogPayload = {
  title: string;
  slug: string;
  summary: string;
  metaTitle: string;
  metaDescription: string;
  coverImagePrompt?: string;
  body: BlogBlock[];
};

export async function generateBlogWithGemini(user: User): Promise<GeneratedBlogPayload> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = buildBlogGenerationPrompt(user);
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned non-JSON");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid Gemini payload");

  const o = parsed as Record<string, unknown>;
  const title = String(o.title || "").trim();
  const slug = String(o.slug || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const summary = String(o.summary || "").trim();
  let metaTitle = String(o.metaTitle || title).trim();
  if (metaTitle.length > 62) metaTitle = metaTitle.slice(0, 62);
  let metaDescription = String(o.metaDescription || summary).trim();
  if (metaDescription.length > 158) metaDescription = metaDescription.slice(0, 158);
  const coverImagePrompt = String(o.coverImagePrompt || "").trim() || undefined;
  const bodyRaw = o.body;
  const body = Array.isArray(bodyRaw) ? (bodyRaw as BlogBlock[]) : [];

  if (!title || !slug || !body.length) throw new Error("Incomplete blog from Gemini");

  return { title, slug, summary, metaTitle, metaDescription, coverImagePrompt, body };
}
