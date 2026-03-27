import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { generateGa4AuthUrl, ga4OAuthConfigured } from "@/lib/ga4-google";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ga4OAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/dashboard/analytics?ga4_error=missing_oauth_env", process.env.AUTH_URL || "http://localhost:3000")
    );
  }

  const state = randomBytes(24).toString("hex");
  const jar = await cookies();
  jar.set("ga4_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.redirect(generateGa4AuthUrl(state));
}
