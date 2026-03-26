import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BlogBodyPreview } from "@/components/blog-body-preview";
import { BlogActions } from "./blog-actions";
import Link from "next/link";

export default async function BlogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { id } = await params;

  const blog = await prisma.blog.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!blog) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href="/dashboard/blogs" className="text-sm font-medium text-accent hover:underline">
        ← All blogs
      </Link>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-primary">{blog.title}</h1>
        <p className="mt-2 text-sm text-muted">{blog.summary}</p>
        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/80 p-4 text-sm">
          <div className="font-medium text-slate-800">Meta title</div>
          <p className="text-muted">{blog.metaTitle}</p>
          <div className="mt-2 font-medium text-slate-800">Meta description</div>
          <p className="text-muted">{blog.metaDescription}</p>
        </div>
      </header>

      <BlogActions blogId={blog.id} title={blog.title} body={blog.body} status={blog.status} />

      <div className="rounded-xl border border-slate-200 bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Preview</h2>
        <div className="mt-4">
          <BlogBodyPreview body={blog.body} />
        </div>
      </div>
    </div>
  );
}
