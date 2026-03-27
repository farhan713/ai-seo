import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Blog, User } from "@prisma/client";
import { blogBodyExcerptForPrompt } from "@/lib/gemini-backfill-images";

export type BlogMetaPair = { metaTitle: string; metaDescription: string };

/** Regenerate SEO meta title + description from full article context (agency CTR rules). */
export async function geminiMetaTagsForBlog(blog: Blog, user: User): Promise<BlogMetaPair> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json" },
  });

  const excerpt = blogBodyExcerptForPrompt(blog.body, 3200);

  const prompt = `You are the SEO lead at a premium digital agency. Rewrite the Google search snippet meta title and meta description for this blog article to maximize CTR while staying accurate.

Hard rules:
- metaTitle: exactly 50 to 60 characters (count spaces). Put the strongest keyword phrase early. One clear benefit or hook. No em dashes, no semicolons, no excessive punctuation, no ALL CAPS.
- metaDescription: exactly 140 to 155 characters. Active voice, concrete value, one soft CTA (e.g. Learn how, Discover, Read the guide). No fake ellipses, no clickbait lies.

Context:
- Business: ${user.businessName || "n/a"}
- Industry: ${user.industry || "n/a"}
- Target keyword hints: ${user.targetKeywords || "n/a"}

Article:
- Display title: ${blog.title}
- Teaser summary: ${blog.summary}
- Previous metaTitle (replace if you improve it): ${blog.metaTitle}
- Previous metaDescription (replace if you improve it): ${blog.metaDescription}

Article body text:
${excerpt}

Return JSON only: { "metaTitle": "string", "metaDescription": "string" }`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const o = JSON.parse(text) as { metaTitle?: string; metaDescription?: string };
  let metaTitle = String(o.metaTitle || blog.metaTitle || blog.title).trim().replace(/[—;]/g, ",");
  let metaDescription = String(o.metaDescription || blog.metaDescription || blog.summary)
    .trim()
    .replace(/[—;]/g, ",");

  if (metaTitle.length > 62) metaTitle = metaTitle.slice(0, 62).trim();
  if (metaDescription.length > 158) metaDescription = metaDescription.slice(0, 158).trim();

  if (metaTitle.length < 35) {
    metaTitle = String(blog.title).slice(0, 60).trim();
  }
  if (metaDescription.length < 100) {
    metaDescription = String(blog.summary).slice(0, 155).trim();
  }

  return { metaTitle, metaDescription };
}
