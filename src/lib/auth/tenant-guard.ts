import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { TenantRole } from "@prisma/client";
import type { Session } from "next-auth";

interface TenantAccess {
  session: Session;
  membership: {
    id: string;
    userId: string;
    companyId: string;
    role: TenantRole;
    createdAt: Date;
  };
}

/**
 * Server-side guard for tenant pages and API routes.
 * Verifies the session exists and the user is a TenantMember of the given company.
 * Redirects if either check fails — never throws.
 */
export async function requireTenantAccess(
  tenantId: string,
  allowedRoles?: TenantRole[]
): Promise<TenantAccess> {
  const session = (await auth()) as Session | null;

  if (!session?.user?.id) {
    redirect("/login");
  }

  const membership = await prisma.tenantMember.findUnique({
    where: {
      userId_companyId: {
        userId: session.user.id,
        companyId: tenantId,
      },
    },
  });

  if (!membership) {
    redirect("/login?error=no-access");
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(membership.role)) {
      redirect("/login?error=forbidden");
    }
  }

  return { session, membership };
}

/**
 * Lightweight session-only check — no DB query.
 * Use this when you just need to confirm the user is logged in
 * and tenantId is already trusted from headers.
 */
export async function requireSession(): Promise<Session> {
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session as Session;
}
