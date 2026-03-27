import { prisma } from "@/lib/prisma";
import { hasSocialAutomation } from "@/lib/plan-access";
import { generateSocialAdCopy } from "@/lib/social-ad-generate";
import { socialImageUsesStockOnly } from "@/lib/creative-image-mode";
import { buildSocialImagenPrompt } from "@/lib/content-imagen-prompts";
import { generateImageDataUrl } from "@/lib/gemini-imagen";
import { pickSocialStockPath } from "@/lib/stock-creative-images";

/** Create or update today’s Elite social ad draft (rule-based image by default; Imagen only if SOCIAL_IMAGE_MODE=imagen). */
export async function upsertEliteSocialDraft(
  userId: string,
  context: string,
  opts?: { geminiApiKey?: string | null }
) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!sub || !hasSocialAutomation(sub.plan)) {
    throw new Error("User needs active Elite plan");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const dateKey = new Date().toISOString().slice(0, 10);
  const { caption } = await generateSocialAdCopy(user, context, { geminiApiKey: opts?.geminiApiKey });
  const fallbackImage = pickSocialStockPath(caption, dateKey, {
    industry: user.industry,
    businessName: user.businessName,
  });
  let imageUrl = fallbackImage;
  if (!socialImageUsesStockOnly()) {
    const imagenPrompt = buildSocialImagenPrompt(caption, {
      industry: user.industry,
      businessName: user.businessName,
    });
    try {
      imageUrl = await generateImageDataUrl({ prompt: imagenPrompt, aspectRatio: "1:1" });
    } catch {
      /* Imagen billing / policy; use stock */
    }
  }

  return prisma.socialAd.upsert({
    where: { userId_dateKey: { userId, dateKey } },
    create: {
      userId,
      dateKey,
      caption,
      imageUrl,
      platforms: ["instagram", "facebook"],
      status: "DRAFT",
    },
    update: {
      caption,
      imageUrl,
      platforms: ["instagram", "facebook"],
      status: "DRAFT",
      errorDetail: null,
    },
  });
}
