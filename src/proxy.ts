import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "atelier_session";
const AUTH_PAGES = ["/login", "/signup"];

async function hasSession(token: string | undefined) {
  if (!token) return false;
  const secret = new TextEncoder().encode(
    process.env.SESSION_SECRET ?? "atelier-noir-local-development-secret",
  );
  try {
    await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const authed = await hasSession(req.cookies.get(SESSION_COOKIE)?.value);

  if (path.startsWith("/atelier") && !authed) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (AUTH_PAGES.includes(path) && authed) {
    return NextResponse.redirect(new URL("/atelier", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/atelier/:path*", "/login", "/signup"],
};
