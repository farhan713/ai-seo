import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  exchangeSearchConsoleCode,
  listSearchConsoleSites,
  pickSearchConsoleSiteUrl,
} from "@/lib/search-console-google";
import { syncSearchConsoleForUser } from "@/lib/search-console-sync";

export async function GET(req: Request) {
  const session = await auth();
  const base = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.redirect(new URL("/login", base));
  }

  const jar = await cookies();
  const expected = jar.get("gsc_oauth_state")?.value;
  jar.delete("gsc_oauth_state");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL("/dashboard/search-performance?gsc_error=invalid_state", base));
  }

  let tokens: Awaited<ReturnType<typeof exchangeSearchConsoleCode>>;
  try {
    tokens = await exchangeSearchConsoleCode(code);
  } catch {
    return NextResponse.redirect(new URL("/dashboard/search-performance?gsc_error=token_exchange", base));
  }

  if (!tokens.refresh_token) {
    return NextResponse.redirect(
      new URL("/dashboard/search-performance?gsc_error=no_refresh_token", base)
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { businessUrl: true },
  });

  let siteUrl: string | null = null;
  try {
    const sites = await listSearchConsoleSites(
      tokens.refresh_token,
      tokens.access_token ?? null,
      tokens.expiry_date ? new Date(tokens.expiry_date) : null
    );
    siteUrl = pickSearchConsoleSiteUrl(sites, user?.businessUrl);
  } catch {
    return NextResponse.redirect(new URL("/dashboard/search-performance?gsc_error=list_sites", base));
  }

  if (!siteUrl) {
    return NextResponse.redirect(new URL("/dashboard/search-performance?gsc_error=no_property", base));
  }

  await prisma.searchConsoleConnection.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? null,
      accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      siteUrl,
      lastSyncError: null,
    },
    update: {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? null,
      accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      siteUrl,
      lastSyncError: null,
    },
  });

  await syncSearchConsoleForUser(session.user.id);

  return NextResponse.redirect(new URL("/dashboard/search-performance?gsc=connected", base));
}
