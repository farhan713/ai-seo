import { prisma } from "@/lib/prisma";
import { generateBlogWithGemini } from "@/lib/gemini-blog";
import type { Prisma } from "@prisma/client";

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

export async function createBlogForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      plan: "SEO_CONTENT",
      status: "ACTIVE",
    },
    orderBy: { createdAt: "desc" },
  });
  if (!sub) throw new Error("No active SEO_CONTENT subscription");

  const used = await countBlogsThisWeek(userId);
  if (used >= sub.blogsPerWeek) {
    throw new Error(`Weekly blog limit reached (${sub.blogsPerWeek})`);
  }

  const gen = await generateBlogWithGemini(user);
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
