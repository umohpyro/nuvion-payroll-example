import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/seal";

/** Nothing works without the visitor's own keys, so send anyone who hasn't connected to Settings. Presence only: the pages open the cookie. */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  return NextResponse.redirect(new URL("/settings", request.url));
}

export const config = { matcher: ["/((?!settings|_next/static|_next/image|favicon.ico).*)"] };
