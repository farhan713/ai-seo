import "./load-env";
import { prisma } from "../lib/prisma";
import { createBlogForUser } from "../lib/blog-service";
import { upsertEliteSocialDraft } from "../lib/social-elite-draft";

const GROWTH_EMAIL = "roardata@guest.seoapp";
const ELITE_EMAIL = "oakwooduae@guest.seoapp";

const socialOnly = process.argv.includes("--social-only");

async function main() {
  const roar = await prisma.user.findUnique({ where: { email: GROWTH_EMAIL } });
  const oak = await prisma.user.findUnique({ where: { email: ELITE_EMAIL } });

  if (!oak) {
    console.error(`Missing user ${ELITE_EMAIL}. Run: npx prisma db seed`);
    process.exit(1);
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.error("Set GEMINI_API_KEY in .env");
    process.exit(1);
  }

  if (!socialOnly) {
    if (!roar) {
      console.error(`Missing user ${GROWTH_EMAIL}. Run: npx prisma db seed`);
      process.exit(1);
    }

    console.log("Generating blog for Growth (Roar Data)…");
    const blogRoar = await createBlogForUser(roar.id, { bypassWeeklyCap: true });
    console.log("  →", blogRoar.title, blogRoar.id);

    console.log("Generating blog for Elite (Oakwood)…");
    const blogOak = await createBlogForUser(oak.id, { bypassWeeklyCap: true });
    console.log("  →", blogOak.title, blogOak.id);
  }

  console.log("Generating today’s social ad draft for Elite…");
  const ad = await upsertEliteSocialDraft(
    oak.id,
    "Portfolio showcase: WebGL and immersive websites for UAE clients"
  );
  console.log("  → SocialAd", ad.dateKey, ad.id);

  console.log("\nDone. Log in as Growth / Elite users to copy blog HTML and view the ad under Social ads.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
