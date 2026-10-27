import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { isPublicPath } from "@/lib/public-paths";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!getSessionCookie(request)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
