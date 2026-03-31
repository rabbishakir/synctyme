import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export default auth(async (req: NextRequest & { auth: Awaited<ReturnType<typeof auth>> }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("error", "unauthorized");

  // Platform routes — require platformRole + @datasyncinc.com email
  if (pathname.startsWith("/platform")) {
    if (!session?.user) return NextResponse.redirect(loginUrl);

    const role = session.user.platformRole;
    if (role !== "SUPER_ADMIN" && role !== "SYSTEM_ADMIN") {
      return NextResponse.redirect(loginUrl);
    }

    const domain = process.env.PLATFORM_ADMIN_DOMAIN ?? "datasyncinc.com";
    if (!session.user.email.endsWith(`@${domain}`)) {
      return NextResponse.redirect(loginUrl);
    }

    const response = NextResponse.next();
    response.headers.set("x-client-ip", clientIp);
    return response;
  }

  // Tenant routes — verify TenantMember exists
  const tenantMatch = pathname.match(/^\/tenant\/([^/]+)/);
  if (tenantMatch) {
    if (!session?.user) return NextResponse.redirect(loginUrl);

    const tenantId = tenantMatch[1];

    const member = await prisma.tenantMember.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId: tenantId,
        },
      },
    });

    if (!member) return NextResponse.redirect(loginUrl);

    const response = NextResponse.next();
    response.headers.set("x-tenant-id", tenantId);
    response.headers.set("x-tenant-role", member.role);
    response.headers.set("x-client-ip", clientIp);
    return response;
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/platform/:path*", "/tenant/:path*"],
};
