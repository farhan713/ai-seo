/**
 * Regenerates metaTitle + metaDescription for every blog from article content (Gemini).
 * Run: npm run backfill:meta
 */
import "./load-env";
import { prisma } from "../lib/prisma";
import { geminiMetaTagsForBlog } from "../lib/gemini-backfill-meta";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.error("GEMINI_API_KEY required.");
    process.exit(1);
  }

  const blogs = await prisma.blog.findMany({ include: { user: true } });
  console.log(`Backfilling meta tags for ${blogs.length} blogs…`);

  for (const b of blogs) {
    try {
      const { metaTitle, metaDescription } = await geminiMetaTagsForBlog(b, b.user);
      await prisma.blog.update({
        where: { id: b.id },
        data: { metaTitle, metaDescription },
      });
      console.log(`  ${b.slug}`);
      console.log(`    title (${metaTitle.length}): ${metaTitle}`);
      const descPreview =
        metaDescription.length > 90 ? `${metaDescription.slice(0, 90)}…` : metaDescription;
      console.log(`    desc (${metaDescription.length}): ${descPreview}`);
    } catch (e) {
      console.error(`  FAIL ${b.id}:`, e);
    }
    await sleep(500);
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
