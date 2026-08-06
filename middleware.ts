import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Middleware Edge Runtime tidak boleh menyentuh Prisma sama sekali,
// jadi di sini pakai authConfig murni (tanpa provider Credentials/Prisma).
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (role !== "ADMIN" && role !== "PEMBINA") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  const protectedPrefixes = ["/settings", "/notifications", "/messages", "/create"];
  if (protectedPrefixes.some((p) => pathname.startsWith(p)) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/settings/:path*", "/notifications/:path*", "/messages/:path*", "/create/:path*"],
};
