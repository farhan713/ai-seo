"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { blockText, blocksToHtml, escapeHtml, parseBlogBody, type BlogBlock } from "@/lib/blog-blocks";

type Props = {
  blogId: string;
  title: string;
  body: unknown;
  status: string;
  coverImageUrl?: string | null;
};

export function BlogActions({ blogId, title, body, status, coverImageUrl }: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [showHtml, setShowHtml] = useState(false);
  const blocks: BlogBlock[] = parseBlogBody(body);
  const inner = blocksToHtml(blocks);
  const hero = coverImageUrl
    ? `<figure><img src="${escapeHtml(coverImageUrl)}" alt="" width="1200" height="630" /></figure>`
    : "";
  const fullHtml = `<article><h1>${escapeHtml(title)}</h1>${hero}${inner}</article>`;

  async function copyHtml() {
    try {
      await navigator.clipboard.writeText(fullHtml);
      setMsg("Copied full article HTML to clipboard. Paste into WordPress “Custom HTML”, Webflow embed, or your CMS HTML block.");
      await fetch(`/api/blogs/${blogId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COPIED" }),
      });
      router.refresh();
    } catch {
      setMsg("Clipboard blocked. Use “Select all” in the box below, then copy (Cmd/Ctrl+C).");
      setShowHtml(true);
    }
  }

  async function copyPlainText() {
    const text = blocks
      .map((b) => {
        if (b.type === "h2") return `\n\n## ${blockText(b)}\n`;
        if (b.type === "p") return `${blockText(b)}\n\n`;
        if (b.type === "callout") return `${blockText(b)}\n\n`;
        if (b.type === "ul") return (b.content || []).map((x) => `• ${x}`).join("\n") + "\n\n";
        return "";
      })
      .join("")
      .trim();
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Copied plain text version for email or docs.");
    } catch {
      setMsg("Could not copy plain text.");
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
    <div className="space-y-4 rounded-xl border border-slate-200 bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Publish from here</h2>
        <p className="mt-1 text-sm text-slate-600">
          Use <strong className="font-medium text-slate-800">Copy HTML</strong> for your site (includes cover image tag
          when set). Use plain text for newsletters or notes.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyHtml}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Copy HTML (for website)
        </button>
        <button
          type="button"
          onClick={copyPlainText}
          className="rounded-lg border border-slate-200 bg-card px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Copy plain text
        </button>
        <button
          type="button"
          onClick={() => setShowHtml((v) => !v)}
          className="rounded-lg border border-slate-200 bg-card px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          {showHtml ? "Hide HTML" : "Show HTML"}
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
      {showHtml ? (
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Raw HTML (select all to copy manually)</label>
          <textarea
            readOnly
            value={fullHtml}
            className="h-48 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800"
            onFocus={(e) => e.target.select()}
          />
        </div>
      ) : null}
    </div>
  );
}
