"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FieldTooltip } from "@/components/field-tooltip";
import { SocialAdCaption } from "@/components/social-ad-caption";
import { RemoteCreativeImage } from "@/components/remote-creative-image";
import { dashboardSocialImageSrc } from "@/lib/creative-image-display";
import { pickSocialStockPath } from "@/lib/stock-creative-images";

type Sub = { plan: string } | null;

type Ad = {
  id: string;
  dateKey: string;
  caption: string;
  imageUrl: string | null;
  status: string;
  errorDetail: string | null;
  createdAt: string;
};

export default function SocialPage() {
  const [sub, setSub] = useState<Sub | undefined>(undefined);
  const [ads, setAds] = useState<Ad[]>([]);
  const [json, setJson] = useState(
    '{\n  "facebookPageAccessToken": "paste-token",\n  "instagramBusinessAccountId": "paste-id"\n}'
  );
  const [msg, setMsg] = useState("");
  const [copyTip, setCopyTip] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/subscription");
        if (cancel) return;
        if (!res.ok) {
          setSub(null);
          return;
        }
        const s = (await res.json()) as Sub;
        if (cancel) return;
        setSub(s);
        if (s?.plan === "ELITE_1599") {
          try {
            const adsRes = await fetch("/api/social/ads");
            if (cancel) return;
            if (adsRes.ok) {
              setAds((await adsRes.json()) as Ad[]);
            } else {
              setAds([]);
            }
          } catch {
            if (!cancel) setAds([]);
          }
        }
      } catch {
        if (!cancel) setSub(null);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  async function saveCredentials(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setMsg("Invalid JSON");
      return;
    }
    const res = await fetch("/api/user/social", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socialCredentials: parsed }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error || "Save failed");
      return;
    }
    setMsg("Saved. Use Meta Business Suite to create long-lived tokens in production.");
  }

  if (loading || sub === undefined) return <p className="text-sm text-muted">Loading…</p>;

  if (!sub || sub.plan !== "ELITE_1599") {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-slate-200 bg-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Social ads</h1>
        <p className="text-sm text-muted">
          Daily AI ads and Meta posting are part of the <strong>Elite · ₹1,599/mo</strong> plan. Contact your admin to
          upgrade.
        </p>
        <Link href="/dashboard" className="text-sm font-medium text-accent hover:underline">
          ← Overview
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Social ads (Elite)</h1>
        <p className="mt-1 text-sm text-muted">
          Store API credentials for automated posting. In production, encrypt at rest and complete Meta app review.
          This MVP stores JSON on the user record for integration work.
        </p>
      </div>

      <form onSubmit={saveCredentials} className="space-y-3 rounded-xl border border-slate-200 bg-card p-6 shadow-sm">
        <label className="flex items-center gap-1 text-sm font-medium text-slate-700">
          Credentials JSON
          <FieldTooltip
            label="Meta tokens for posting (overview)"
            steps={[
              "In Meta for Developers, create or open your app and add the Marketing API product if needed.",
              "Use Graph API Explorer with a System User or Page access token, or Meta Business Suite → Settings → Business assets.",
              "Generate a long-lived Page access token for the Facebook Page you post to; note the connected Instagram Business Account ID.",
              "Paste JSON here with keys like facebookPageAccessToken and instagramBusinessAccountId (see placeholder). Rotate tokens if leaked.",
            ]}
          />
        </label>
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
        />
        {msg ? <p className="text-sm text-accent">{msg}</p> : null}
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Save credentials
        </button>
      </form>

      <div>
        <h2 className="font-semibold text-slate-900">Recent drafts</h2>
        <p className="mt-1 text-xs text-muted">
          Visuals are generated from your ad copy. Use &quot;Copy full pack&quot; for captions and optional extra creative notes.
        </p>
        {copyTip ? <p className="mt-2 text-sm text-accent">{copyTip}</p> : null}
        <ul className="mt-3 space-y-3">
          {ads.length === 0 ? (
            <li className="text-sm text-muted">No ads yet. Ask admin to generate a daily draft.</li>
          ) : (
            ads.map((a) => {
              const stockAd = pickSocialStockPath(a.caption, a.dateKey);
              const adSrc = dashboardSocialImageSrc(a.imageUrl, a.caption, a.dateKey);
              return (
              <li key={a.id} className="rounded-lg border border-slate-100 p-4 text-sm">
                <p className="text-xs font-medium text-slate-600">Ad creative</p>
                <RemoteCreativeImage
                  src={adSrc}
                  fallbackSrc={stockAd}
                  alt="Generated ad visual"
                  className="mt-2 w-full max-h-96 rounded-xl border border-slate-200 object-cover shadow-md"
                  emptyLabel="No image URL for this draft. In Admin → AI content, generate today’s social draft for this user."
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-muted">
                    {a.dateKey} · {a.status}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(a.caption);
                        setCopyTip("Copied to clipboard.");
                      } catch {
                        setCopyTip("Could not copy. Select the caption text manually.");
                      }
                    }}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-primary hover:bg-slate-50"
                  >
                    Copy full pack
                  </button>
                </div>
                <div className="mt-3">
                  <SocialAdCaption text={a.caption} />
                </div>
                {a.errorDetail ? <p className="mt-1 text-xs text-muted">{a.errorDetail}</p> : null}
              </li>
              );
            })
          )}
        </ul>
      </div>

      <Link href="/dashboard" className="text-sm font-medium text-accent hover:underline">
        ← Overview
      </Link>
    </div>
  );
}
