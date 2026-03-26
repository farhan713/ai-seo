"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { blocksToHtml, escapeHtml, parseBlogBody, type BlogBlock } from "@/lib/blog-blocks";

type Props = {
  blogId: string;
  title: string;
  body: unknown;
  status: string;
};

export function BlogActions({ blogId, title, body, status }: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const blocks: BlogBlock[] = parseBlogBody(body);
  const inner = blocksToHtml(blocks);
  const fullHtml = `<article><h1>${escapeHtml(title)}</h1>${inner}</article>`;

  async function copyHtml() {
    try {
      await navigator.clipboard.writeText(fullHtml);
      setMsg("Copied HTML to clipboard.");
      await fetch(`/api/blogs/${blogId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COPIED" }),
      });
      router.refresh();
    } catch {
      setMsg("Could not copy. Select and copy manually.");
    }
  }

  async function markPublished() {
    await fetch(`/api/blogs/${blogId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PUBLISHED" }),
    });
    setMsg("Marked as published.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyHtml}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Copy HTML
        </button>
        <button
          type="button"
          onClick={markPublished}
          className="rounded-lg border border-slate-200 bg-card px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Mark published
        </button>
      </div>
      {msg ? <p className="text-sm text-accent">{msg}</p> : null}
      <p className="text-xs text-muted">Status: {status}</p>
    </div>
  );
}
