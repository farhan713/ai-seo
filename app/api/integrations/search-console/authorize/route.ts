import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { generateSearchConsoleAuthUrl, searchConsoleOAuthConfigured } from "@/lib/search-console-google";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!searchConsoleOAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/dashboard/search-performance?gsc_error=missing_oauth_env", process.env.AUTH_URL || "http://localhost:3000")
    );
  }

  const state = randomBytes(24).toString("hex");
  const jar = await cookies();
  jar.set("gsc_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });

  const url = generateSearchConsoleAuthUrl(state);
  return NextResponse.redirect(url);
}
