import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "sighted75:session";

export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*"],
};
