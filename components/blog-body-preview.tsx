import { blocksToHtml, parseBlogBody } from "@/lib/blog-blocks";

export function BlogBodyPreview({ body }: { body: unknown }) {
  const blocks = parseBlogBody(body);
  const html = blocksToHtml(blocks);
  return (
    <article
      className="blog-preview max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
