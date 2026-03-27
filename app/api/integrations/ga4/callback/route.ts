import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { exchangeGa4Code } from "@/lib/ga4-google";

export async function GET(req: Request) {
  const session = await auth();
  const base = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.redirect(new URL("/login", base));
  }

  const jar = await cookies();
  const expected = jar.get("ga4_oauth_state")?.value;
  jar.delete("ga4_oauth_state");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL("/dashboard/analytics?ga4_error=invalid_state", base));
  }

  let tokens: Awaited<ReturnType<typeof exchangeGa4Code>>;
  try {
    tokens = await exchangeGa4Code(code);
  } catch {
    return NextResponse.redirect(new URL("/dashboard/analytics?ga4_error=token_exchange", base));
  }

  if (!tokens.refresh_token) {
    return NextResponse.redirect(new URL("/dashboard/analytics?ga4_error=no_refresh_token", base));
  }

  await prisma.ga4Connection.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? null,
      accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
    update: {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? null,
      accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      lastSyncError: null,
    },
  });

  return NextResponse.redirect(new URL("/dashboard/analytics?ga4=connected", base));
}
