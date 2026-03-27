import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BlogBodyPreview } from "@/components/blog-body-preview";
import { RemoteCreativeImage } from "@/components/remote-creative-image";
import { dashboardBlogCoverSrc } from "@/lib/creative-image-display";
import { pickBlogHeroPath } from "@/lib/stock-creative-images";
import { BlogActions } from "./blog-actions";
import { SocialPostPackBlog } from "@/components/social-post-pack-blog";
import { hasGrowthFeatures } from "@/lib/plan-access";
import Link from "next/link";

export default async function BlogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { id } = await params;

  const blog = await prisma.blog.findFirst({
    where: { id, userId: session.user.id },
    include: { user: { select: { industry: true } } },
  });
  if (!blog) notFound();

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { plan: true },
  });
  const showSocialPack = sub && hasGrowthFeatures(sub.plan);

  const stockCover = pickBlogHeroPath(blog.title, blog.slug, blog.user.industry);
  const coverSrc = dashboardBlogCoverSrc(blog.coverImageUrl, blog.title, blog.slug, blog.user.industry);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href="/dashboard/blogs" className="text-sm font-medium text-accent hover:underline">
        ← All blogs
      </Link>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-primary">{blog.title}</h1>
        <p className="mt-2 text-sm text-muted">{blog.summary}</p>
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Cover image</p>
          <RemoteCreativeImage
            src={coverSrc}
            fallbackSrc={stockCover}
            alt=""
            className="w-full max-h-[22rem] rounded-xl border border-slate-200 object-cover shadow-sm"
            emptyLabel="No cover image yet. Regenerate this post from Admin, or ask support to refresh assets."
          />
        </div>
        {blog.coverImagePrompt ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/90 p-4 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Creative direction</p>
            <p className="mt-2 whitespace-pre-wrap text-slate-800">{blog.coverImagePrompt}</p>
          </div>
        ) : null}
        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/80 p-4 text-sm">
          <p className="mb-2 text-xs text-muted">
            Meta tags are generated for Google CTR (typical targets: title ~50 to 60 chars, description ~140 to 155).
          </p>
          <div className="font-medium text-slate-800">Meta title ({blog.metaTitle.length} chars)</div>
          <p className="text-muted">{blog.metaTitle}</p>
          <div className="mt-2 font-medium text-slate-800">Meta description ({blog.metaDescription.length} chars)</div>
          <p className="text-muted">{blog.metaDescription}</p>
        </div>
      </header>

      <BlogActions
        blogId={blog.id}
        title={blog.title}
        body={blog.body}
        status={blog.status}
        coverImageUrl={coverSrc}
      />

      {showSocialPack ? <SocialPostPackBlog blogId={blog.id} /> : null}

      <div className="rounded-xl border border-slate-200 bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Preview</h2>
        <p className="mt-1 text-xs text-muted">Body only below. Cover is shown above with meta.</p>
        <div className="mt-4">
          <BlogBodyPreview body={blog.body} />
        </div>
      </div>
    </div>
  );
}
