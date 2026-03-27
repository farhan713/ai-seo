import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

/**
 * Edge-safe auth config (no Prisma / bcrypt). Used only by middleware so Vercel Edge stays under 1MB.
 * Full Credentials + DB live in auth.ts.
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const pathname = nextUrl.pathname;

      if (pathname.startsWith("/dashboard")) {
        if (!auth?.user) return false;
        if (auth.user.role !== "CLIENT") {
          return NextResponse.redirect(new URL("/admin", nextUrl));
        }
      }

      if (pathname.startsWith("/admin")) {
        if (!auth?.user) return false;
        if (auth.user.role !== "ADMIN") {
          return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
