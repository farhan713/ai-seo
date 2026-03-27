import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/** Edge bundle must stay small (Vercel Hobby ~1MB). Do not import auth.ts / Prisma here. */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
