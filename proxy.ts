import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/verify", "/api/auth"];

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/offline.html"
  ) {
    return NextResponse.next();
  }

  // Not authenticated — redirect to login
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  let onboardingStatus = req.auth.user?.onboardingStatus;

  // Authenticated but onboarding incomplete — redirect to onboarding
  // (allow /onboarding/* and /api/* through)
  if (
    onboardingStatus !== "COMPLETE" &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/api/") &&
    pathname !== "/"
  ) {
    // JWT can lag behind the DB (session.update() doesn't always flush the cookie
    // before the next navigation fires). Check the DB directly as a fallback so
    // a freshly-completed user isn't bounced back to onboarding.
    const dbUser = await prisma.user.findUnique({
      where: { id: req.auth.user.id },
      select: { onboardingStatus: true },
    });
    onboardingStatus = dbUser?.onboardingStatus ?? onboardingStatus;

    if (onboardingStatus !== "COMPLETE") {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
