import { NextResponse, type NextRequest } from "next/server";
import { loadAuthConfig } from "@/common/infrastructure/config/auth-config";
import { ADMIN_SESSION_COOKIE, parseAdminSessionCookie } from "@/features/admin/presentation/admin-session-cookie";
import { ADMIN_LOGIN_PATH, isAdminPagePath } from "@/features/admin/presentation/routes";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isAdminPagePath(pathname)) return NextResponse.next();

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const auth = loadAuthConfig();
  const secret = new TextEncoder().encode(auth.secret);
  const payload = await parseAdminSessionCookie(token, secret, auth.issuer, `${auth.audience}-admin`);
  if (!payload) {
    const login = new URL(ADMIN_LOGIN_PATH, request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/housing/admin/:path*", "/benefits/admin/:path*", "/finance/admin/:path*", "/jobs/admin/:path*", "/living/admin/:path*"],
};