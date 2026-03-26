import { GoogleGenerativeAI } from "@google/generative-ai";
import type { User } from "@prisma/client";
import type { BlogBlock } from "./blog-blocks";

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

  return `You are an expert SEO blog writer. Write one complete blog post for this business.

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
- No robotic filler. Be specific to this business and industry.
- Structure the article with clear h2 sections, bullet lists where useful, and one callout box with a practical tip or warning.
- Length: roughly 900 to 1400 words of readable body text across all blocks.

Output format: respond with JSON only, no markdown fences. Use this exact shape:
{
  "title": "string",
  "slug": "lowercase-kebab-case-slug",
  "summary": "one paragraph teaser under 220 characters",
  "metaTitle": "under 60 chars, includes primary keyword",
  "metaDescription": "under 155 chars, compelling",
  "body": [
    { "type": "h2", "text": "Section heading" },
    { "type": "p", "text": "Paragraph..." },
    { "type": "ul", "content": ["bullet one", "bullet two"] },
    { "type": "callout", "text": "Short tip or note in a highlighted box." }
  ]
}

The body array must alternate sections logically: start after title with an intro p, then h2/p patterns, include at least two h2 sections, at least one ul, and exactly one callout. Every block must use the types h2, p, ul, or callout only. For p and h2 and callout use the property "text" for the string content.`;
}

export type GeneratedBlogPayload = {
  title: string;
  slug: string;
  summary: string;
  metaTitle: string;
  metaDescription: string;
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
  const metaTitle = String(o.metaTitle || title).slice(0, 70);
  const metaDescription = String(o.metaDescription || summary).slice(0, 160);
  const bodyRaw = o.body;
  const body = Array.isArray(bodyRaw) ? (bodyRaw as BlogBlock[]) : [];

  if (!title || !slug || !body.length) throw new Error("Incomplete blog from Gemini");

  return { title, slug, summary, metaTitle, metaDescription, body };
}
