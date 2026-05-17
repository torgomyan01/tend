import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROUTES } from "@/lib/routes";

const UNVERIFIED_ALLOWED_PREFIXES = [
  "/account/verify",
  "/account/verify-telegram",
  "/verify-email",
  "/api/auth/email-verification",
  "/api/auth/verify-email",
  "/api/auth/telegram-verification",
  "/api/auth/session",
  "/api/auth/signout",
  "/api/auth/csrf",
  "/api/auth/providers",
  "/api/telegram",
];

const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/privacy",
  "/how-it-works",
  "/providers",
  "/categories",
  "/tenders",
  "/users",
  "/api/auth",
  "/api/telegram",
  "/_next",
  "/favicon",
];

function isAllowedWhileUnverified(pathname: string) {
  return UNVERIFIED_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isPublicPath(pathname: string) {
  if (pathname === "/") {
    return true;
  }

  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isProtectedPath(pathname: string) {
  if (pathname.startsWith("/account")) {
    return true;
  }
  if (pathname === "/tenders/new" || pathname.endsWith("/edit")) {
    return true;
  }
  if (pathname.startsWith("/admin")) {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    isPublicPath(pathname)
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.sub) {
    return NextResponse.next();
  }

  if (token.accountVerified) {
    return NextResponse.next();
  }

  if (isAllowedWhileUnverified(pathname)) {
    return NextResponse.next();
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const verifyUrl = new URL(ROUTES.accountVerify, request.url);
  verifyUrl.searchParams.set("callbackUrl", pathname);

  return NextResponse.redirect(verifyUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
