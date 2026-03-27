import { GoogleGenerativeAI } from "@google/generative-ai";
import type { User } from "@prisma/client";

export type SocialAdCopyPack = {
  headline: string;
  instagramCaption: string;
  facebookPrimaryText: string;
  callToAction: string;
  hashtagBlock: string;
  /** Rich prompt for AI image generation (no tiny slogans). */
  imageArtDirection: string;
};

function formatPackForDashboard(p: SocialAdCopyPack): string {
  return [
    "━━ INSTAGRAM (feed / reel caption) ━━",
    p.instagramCaption.trim(),
    "",
    "━━ FACEBOOK (primary text) ━━",
    p.headline.trim(),
    "",
    p.facebookPrimaryText.trim(),
    "",
    `CTA: ${p.callToAction.trim()}`,
    "",
    p.hashtagBlock.trim(),
    "",
    "━━ CREATIVE (for designer / image tool) ━━",
    p.imageArtDirection.trim(),
  ].join("\n");
}

export async function generateSocialAdCopy(
  user: User,
  context: string,
  opts?: { geminiApiKey?: string | null }
): Promise<{ caption: string; imageHint: string; pack: SocialAdCopyPack }> {
  const apiKey = opts?.geminiApiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set and no client Gemini key provided");

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `You combine two senior roles: (1) a lead performance creative and art director with 15 years on Meta and premium B2B campaigns (think Meta Creative Shop discipline), and (2) a growth and analytics lead with 20 years optimizing paid social against CPA, intent, and creative fatigue. Copy must sell and still feel accountable to data.

Write paid social creative for Meta (Facebook + Instagram).

Brand facts:
- Business name: ${user.businessName || "Client"}
- Website: ${user.businessUrl || "n/a"}
- What they do: ${user.businessDescription || "n/a"}
- Industry: ${user.industry || "n/a"}
- Campaign angle, season, or hook: ${context}

Creative rules:
- No em dashes. No semicolons. Short punchy sentences.
- Sound human, confident, specific to THIS business (not generic platitudes). Prefer one concrete hook (metric, outcome, locale, or product truth) where it fits the analytics mindset.
- Instagram caption: strong hook in the first line, 2 to 5 short lines, social proof or specificity where possible, end with CTA and hashtag block on its own last line area.
- Facebook primary text: can be slightly longer than IG, still scannable, benefit-led, one clear CTA.
- Headline: max 40 characters, can be used as ad headline style.
- Hashtags: 5 to 10 relevant mixed reach and niche, no spam, space-separated with #.
- imageArtDirection: ONE paragraph, 100 to 220 words. The dashboard uses a stock square placeholder only. Write the brief as if handing off to a senior designer for a 1:1 feed asset: scene and narrative beat, talent or product styling, environment, lighting mood, camera and lens character, color grade, composition, thumb-stopping focal point, and safe space for future text overlays if the client adds them later. Explicit: describe the frame as no baked-in logos, watermarks, or headline text in the image. Avoid lazy stock clichés unless on-brand. Tie visually to this campaign angle and industry.

Return JSON only, exact keys:
{
  "headline": "string max 40 chars",
  "instagramCaption": "string",
  "facebookPrimaryText": "string",
  "callToAction": "string short e.g. Book a call",
  "hashtagBlock": "string with #tags separated by spaces",
  "imageArtDirection": "string long paragraph as specified"
}`;

  let text = "";
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      text = result.response.text();
      break;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const retryable = msg.includes("503") || msg.includes("429") || msg.includes("UNAVAILABLE");
      if (!retryable || attempt === maxAttempts) throw e;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }

  const o = JSON.parse(text) as Record<string, unknown>;
  const pack: SocialAdCopyPack = {
    headline: String(o.headline || "").trim().slice(0, 42),
    instagramCaption: String(o.instagramCaption || "").trim(),
    facebookPrimaryText: String(o.facebookPrimaryText || "").trim(),
    callToAction: String(o.callToAction || "Learn more").trim(),
    hashtagBlock: String(o.hashtagBlock || "").trim(),
    imageArtDirection: String(o.imageArtDirection || "").trim(),
  };

  if (!pack.instagramCaption || !pack.facebookPrimaryText) {
    throw new Error("Incomplete ad copy from model");
  }
  if (!pack.imageArtDirection) {
    pack.imageArtDirection = `Premium advertising photograph for ${user.businessName || "this brand"} in ${user.industry || "their industry"}, cinematic lighting, shallow depth of field, no text in frame, no watermarks, square composition.`;
  }

  return {
    caption: formatPackForDashboard(pack),
    imageHint: pack.imageArtDirection.slice(0, 200) + (pack.imageArtDirection.length > 200 ? "…" : ""),
    pack,
  };
}
