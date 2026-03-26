import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (pathname.startsWith("/dashboard")) {
    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (session.user.role !== "CLIENT") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
