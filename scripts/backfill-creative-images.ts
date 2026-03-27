/**
 * Regenerate blog covers and social images from stored content (rule-based by default; Imagen if *_MODE=imagen).
 * Run: npm run backfill:images
 */
import "./load-env";
import { prisma } from "../lib/prisma";
import { blogBodyExcerptForImagen } from "../lib/blog-body-excerpt";
import {
  blogCoverUsesStockOnly,
  socialImageUsesStockOnly,
} from "../lib/creative-image-mode";
import { buildBlogImagenPrompt, buildSocialImagenPrompt } from "../lib/content-imagen-prompts";
import { generateImageDataUrl } from "../lib/gemini-imagen";
import { pickBlogHeroPath, pickSocialStockPath } from "../lib/stock-creative-images";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const blogStock = blogCoverUsesStockOnly();
  const socialStock = socialImageUsesStockOnly();
  if (!blogStock || !socialStock) {
    if (!process.env.GEMINI_API_KEY?.trim()) {
      console.error("GEMINI_API_KEY required when Imagen is enabled (not stock-only mode).");
      process.exit(1);
    }
  }

  const blogs = await prisma.blog.findMany({ include: { user: true } });
  console.log(`Regenerating ${blogs.length} blog covers (${blogStock ? "stock rules only" : "Imagen + fallback"})…`);
  for (const b of blogs) {
    const fallback = pickBlogHeroPath(b.title, b.slug, b.user.industry);
    let url = fallback;
    if (!blogStock) {
      const prompt = buildBlogImagenPrompt({
        title: b.title,
        summary: b.summary,
        metaTitle: b.metaTitle,
        metaDescription: b.metaDescription,
        coverImagePrompt: b.coverImagePrompt,
        industry: b.user.industry,
        businessName: b.user.businessName,
        bodyExcerpt: blogBodyExcerptForImagen(b.body),
      });
      try {
        url = await generateImageDataUrl({ prompt, aspectRatio: "16:9" });
        console.log(`  blog ${b.slug} → Imagen data URL`);
      } catch (e) {
        console.warn(`  blog ${b.slug} Imagen failed, fallback:`, e instanceof Error ? e.message : e);
      }
      await sleep(1800);
    } else {
      console.log(`  blog ${b.slug} → ${url}`);
    }
    await prisma.blog.update({ where: { id: b.id }, data: { coverImageUrl: url } });
  }

  const ads = await prisma.socialAd.findMany({ include: { user: true } });
  console.log(`Regenerating ${ads.length} social images (${socialStock ? "stock rules only" : "Imagen + fallback"})…`);
  for (const a of ads) {
    const fallback = pickSocialStockPath(a.caption, a.dateKey, {
      industry: a.user.industry,
      businessName: a.user.businessName,
    });
    let url = fallback;
    if (!socialStock) {
      const prompt = buildSocialImagenPrompt(a.caption, {
        industry: a.user.industry,
        businessName: a.user.businessName,
      });
      try {
        url = await generateImageDataUrl({ prompt, aspectRatio: "1:1" });
        console.log(`  ad ${a.dateKey} → Imagen data URL`);
      } catch (e) {
        console.warn(`  ad ${a.dateKey} Imagen failed, fallback:`, e instanceof Error ? e.message : e);
      }
      await sleep(1800);
    } else {
      console.log(`  ad ${a.dateKey} → ${url}`);
    }
    await prisma.socialAd.update({ where: { id: a.id }, data: { imageUrl: url } });
  }

  console.log("Done.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
