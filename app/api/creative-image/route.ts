import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const ALLOWED_HOSTS = new Set(["gen.pollinations.ai", "image.pollinations.ai"]);

/**
 * Same idea as PageSpeed / Gemini: the browser never calls Pollinations with your secret key.
 * Dashboard <img src="/api/creative-image?u=..."> — server fetches gen.pollinations.ai with auth.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = req.nextUrl.searchParams.get("u");
  if (!raw?.trim()) {
    return NextResponse.json({ error: "Missing u" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  const secret = process.env.POLLINATIONS_API_KEY?.trim();
  const publishable = process.env.POLLINATIONS_PUBLISHABLE_KEY?.trim();

  const upstream = new URL(target.href);
  if (!upstream.searchParams.has("key")) {
    const key = secret || publishable;
    if (!key) {
      return NextResponse.json(
        {
          error:
            "Set POLLINATIONS_API_KEY (secret, from enter.pollinations.ai) or POLLINATIONS_PUBLISHABLE_KEY in .env so images can load.",
        },
        { status: 503 }
      );
    }
    upstream.searchParams.set("key", key);
  }

  const res = await fetch(upstream.toString(), {
    headers: {
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    cache: "no-store",
  });

  const ct = res.headers.get("content-type") || "";

  if (!res.ok) {
    const errText = await res.text();
    return new NextResponse(errText, {
      status: res.status,
      headers: { "content-type": ct || "application/json" },
    });
  }

  if (!ct.startsWith("image/")) {
    const errText = await res.text();
    return new NextResponse(errText, {
      status: 502,
      headers: { "content-type": ct || "text/plain" },
    });
  }

  return new NextResponse(res.body, {
    status: 200,
    headers: {
      "Content-Type": ct,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
