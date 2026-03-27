import { prisma } from "@/lib/prisma";
import { generateBlogWithGemini } from "@/lib/gemini-blog";
import type { Prisma } from "@prisma/client";
import { hasGrowthFeatures } from "@/lib/plan-access";
import { blogBodyExcerptForImagen } from "@/lib/blog-body-excerpt";
import { blogCoverUsesStockOnly } from "@/lib/creative-image-mode";
import { buildBlogImagenPrompt } from "@/lib/content-imagen-prompts";
import { generateImageDataUrl } from "@/lib/gemini-imagen";
import { pickBlogHeroPath } from "@/lib/stock-creative-images";

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getUTCDay();
  const diff = (day + 6) % 7;
  x.setUTCDate(x.getUTCDate() - diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export async function countBlogsThisWeek(userId: string) {
  const from = startOfWeek(new Date());
  return prisma.blog.count({
    where: {
      userId,
      generatedAt: { gte: from },
    },
  });
}

export async function createBlogForUser(
  userId: string,
  options?: { bypassWeeklyCap?: boolean }
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    orderBy: { createdAt: "desc" },
  });
  if (!sub || !hasGrowthFeatures(sub.plan)) {
    throw new Error("No active Growth or Elite subscription (blogs not included on Starter)");
  }
  if (sub.blogsPerWeek <= 0) throw new Error("This plan has no weekly blog quota");

  if (!options?.bypassWeeklyCap) {
    const used = await countBlogsThisWeek(userId);
    if (used >= sub.blogsPerWeek) {
      throw new Error(`Weekly blog limit reached (${sub.blogsPerWeek})`);
    }
  }

  const gen = await generateBlogWithGemini(user);
  const fallbackCover = pickBlogHeroPath(gen.title, gen.slug, user.industry);
  let coverImageUrl = fallbackCover;
  if (!blogCoverUsesStockOnly()) {
    const imagenPrompt = buildBlogImagenPrompt({
      title: gen.title,
      summary: gen.summary,
      metaTitle: gen.metaTitle,
      metaDescription: gen.metaDescription,
      coverImagePrompt: gen.coverImagePrompt,
      industry: user.industry,
      businessName: user.businessName,
      bodyExcerpt: blogBodyExcerptForImagen(gen.body),
    });
    try {
      coverImageUrl = await generateImageDataUrl({ prompt: imagenPrompt, aspectRatio: "16:9" });
    } catch {
      /* Imagen may require billing; keep topic fallback */
    }
  }
  let slug = gen.slug;
  let attempt = 0;
  while (attempt < 5) {
    try {
      const blog = await prisma.blog.create({
        data: {
          userId,
          title: gen.title,
          slug,
          summary: gen.summary,
          body: gen.body as unknown as Prisma.InputJsonValue,
          metaTitle: gen.metaTitle,
          metaDescription: gen.metaDescription,
          coverImageUrl,
          coverImagePrompt: gen.coverImagePrompt ?? null,
          status: "GENERATED",
        },
      });
      return blog;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("Unique constraint") && attempt < 4) {
        attempt += 1;
        slug = `${gen.slug}-${Date.now().toString(36)}`;
        continue;
      }
      throw e;
    }
  }
  throw new Error("Could not create blog with unique slug");
}
