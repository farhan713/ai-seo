import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasAuditAccess, hasGrowthFeatures, socialPostPackPlatforms } from "@/lib/plan-access";
import { generateSocialPostPack } from "@/lib/social-post-pack-gemini";
import { blockText, parseBlogBody } from "@/lib/blog-blocks";
import type { BlogBlock } from "@/lib/blog-blocks";

function excerptFromBody(body: unknown): string {
  const blocks: BlogBlock[] = parseBlogBody(body);
  return blocks
    .map((b) => {
      if (b.type === "ul") return (b.content || []).join(" ");
      return blockText(b);
    })
    .join("\n")
    .slice(0, 3500);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { plan: true },
  });
  if (!sub || !hasAuditAccess(sub.plan)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const platforms = socialPostPackPlatforms(sub.plan);
  if (platforms.length === 0) {
    return NextResponse.json({ error: "Plan does not include social packs" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const blogId = typeof body.blogId === "string" ? body.blogId : "";
  const auditId = typeof body.auditId === "string" ? body.auditId : "";

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      businessName: true,
      industry: true,
      industryVertical: true,
      marketingGoal: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let title = "";
  let summary = "";
  let excerpt = "";
  let sourceLabel = "";
  let saveBlogId: string | null = null;
  let saveAuditId: string | null = null;

  if (blogId) {
    if (!hasGrowthFeatures(sub.plan)) {
      return NextResponse.json({ error: "Blog-based packs require Growth or Elite" }, { status: 403 });
    }
    const blog = await prisma.blog.findFirst({
      where: { id: blogId, userId: session.user.id },
    });
    if (!blog) return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    title = blog.title;
    summary = blog.summary;
    excerpt = excerptFromBody(blog.body);
    sourceLabel = `Blog: ${blog.title}`;
    saveBlogId = blog.id;
  } else if (auditId) {
    const audit = await prisma.siteAudit.findFirst({
      where: { id: auditId, userId: session.user.id },
    });
    if (!audit) return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    title = `Site audit: ${audit.url}`;
    summary = audit.summary.slice(0, 800);
    excerpt = audit.summary;
    sourceLabel = `Site audit ${audit.url}`;
    saveAuditId = audit.id;
  } else {
    return NextResponse.json({ error: "blogId or auditId required" }, { status: 400 });
  }

  const pack = await generateSocialPostPack({
    businessName: user.businessName,
    industry: user.industry,
    industryVertical: user.industryVertical,
    marketingGoal: user.marketingGoal,
    sourceLabel,
    title,
    summary,
    bodyExcerpt: excerpt,
    platforms,
  });

  const row = await prisma.socialPostPack.create({
    data: {
      userId: session.user.id,
      blogId: saveBlogId,
      siteAuditId: saveAuditId,
      linkedin: pack.linkedin || null,
      instagram: pack.instagram || null,
      facebook: pack.facebook || null,
    },
  });

  return NextResponse.json({
    id: row.id,
    linkedin: row.linkedin,
    instagram: row.instagram,
    facebook: row.facebook,
    createdAt: row.createdAt.toISOString(),
  });
}
