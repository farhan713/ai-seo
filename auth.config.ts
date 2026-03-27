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
    /**
     * Middleware uses NextAuth(authConfig) only — it never runs auth.ts callbacks.
     * Without this, JWT has `role` but session.user does not, so role is undefined in `authorized`
     * and /admin ↔ /dashboard redirect forever (ERR_TOO_MANY_REDIRECTS).
     */
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id ?? "";
        session.user.role = token.role as typeof session.user.role;
        session.user.email =
          (token.email as string | undefined) ?? session.user.email ?? "";
        session.user.name =
          (token.name as string | undefined) ?? session.user.name ?? "";
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const pathname = nextUrl.pathname;
      const role = auth?.user?.role;

      if (pathname.startsWith("/dashboard")) {
        if (!auth?.user) return false;
        if (role === "CLIENT") return true;
        if (role === "ADMIN") {
          return NextResponse.redirect(new URL("/admin", nextUrl));
        }
        return false;
      }

      if (pathname.startsWith("/admin")) {
        if (!auth?.user) return false;
        if (role === "ADMIN") return true;
        if (role === "CLIENT") {
          return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
        return false;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
