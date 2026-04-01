import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const secret =
    process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const token = await getToken({
    req: request,
    secret,
  });

  const { pathname } = request.nextUrl;

  // ── Platform routes (/platform/*) ──────────────────────────────────────
  if (pathname.startsWith("/platform")) {
    const domain = process.env.PLATFORM_ADMIN_DOMAIN ?? "datasyncinc.com";
    const hasRole = !!token?.platformRole;
    const hasEmail = typeof token?.email === "string" &&
      token.email.endsWith(`@${domain}`);

    if (!token || !hasRole || !hasEmail) {
      return NextResponse.redirect(
        new URL("/login?error=unauthorized", request.url)
      );
    }

    const response = NextResponse.next();
    response.headers.set(
      "x-client-ip",
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        "unknown"
    );
    return response;
  }

  // ── Tenant selector (logged-in tenant users) ─────────────────────────
  if (pathname.startsWith("/tenant-selector")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // ── Tenant routes (/tenant/[tenantId]/*) ───────────────────────────────
  if (pathname.startsWith("/tenant/")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const tenantId = pathname.split("/")[2];
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-tenant-id", tenantId);
    requestHeaders.set("x-user-id", token.sub ?? "");
    requestHeaders.set("x-client-ip", clientIp);

    // TenantMember DB check happens at page/route level — not here
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/platform/:path*", "/tenant/:path*", "/tenant-selector"],
};
