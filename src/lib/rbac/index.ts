import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { PlatformRole, TenantRole } from "@prisma/client";
import type { Session } from "next-auth";

type RouteContext = { params: Promise<Record<string, string>> };

export type AppRouteHandler = (
  req: NextRequest,
  context: RouteContext
) => Promise<Response>;

/**
 * Resolves whether the user satisfies any of `allowedRoles` using
 * `session.user.platformRole` and/or `TenantMember.role` for `tenantId`.
 */
export async function isAllowedRole(
  session: Session | null,
  allowedRoles: string[],
  tenantId?: string
): Promise<boolean> {
  if (!session?.user?.id) return false;

  const platformRole = session.user.platformRole as PlatformRole | null;
  if (platformRole && allowedRoles.includes(platformRole)) {
    return true;
  }

  if (tenantId) {
    const member = await prisma.tenantMember.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId: tenantId,
        },
      },
    });
    if (member && allowedRoles.includes(member.role)) {
      return true;
    }
  }

  return false;
}

/**
 * HOF that wraps App Router API handlers. Checks `session.platformRole` or
 * `TenantMember.role` when `tenantId` is present in `context.params`.
 *
 * @example
 * export const POST = withRole(["COMPANY_ADMIN"])(async (req, ctx) => { ... });
 */
export function withRole(allowedRoles: string[]) {
  return function wrap(handler: AppRouteHandler): AppRouteHandler {
    return async (req: NextRequest, context: RouteContext) => {
      const session = (await auth()) as Session | null;
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const params = await (context?.params ?? Promise.resolve({}));
      const tenantId = params.tenantId ?? params.id;

      const ok = await isAllowedRole(session, allowedRoles, tenantId);
      if (!ok) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      return handler(req, context);
    };
  };
}

/** Action keys for tenant-scoped permission checks. */
export type RbacAction =
  | "view_all"
  | "approve_company_deletion"
  | "manage_tenant_users"
  | "manage_tenant_settings"
  | "manage_consultants_non_financial"
  | "approve_timesheets_edit_rates"
  | "view_own_enter_time";

const ALL_ACTIONS: RbacAction[] = [
  "view_all",
  "approve_company_deletion",
  "manage_tenant_users",
  "manage_tenant_settings",
  "manage_consultants_non_financial",
  "approve_timesheets_edit_rates",
  "view_own_enter_time",
];

const PLATFORM_MATRIX: Record<PlatformRole, Set<RbacAction>> = {
  SUPER_ADMIN: new Set<RbacAction>([
    "view_all",
    "approve_company_deletion",
    "manage_tenant_users",
    "manage_tenant_settings",
    "manage_consultants_non_financial",
    "approve_timesheets_edit_rates",
    "view_own_enter_time",
  ]),
  SYSTEM_ADMIN: new Set<RbacAction>([
    "view_all",
    "approve_company_deletion",
  ]),
};

const TENANT_MATRIX: Record<TenantRole, Set<RbacAction>> = {
  COMPANY_ADMIN: new Set<RbacAction>([
    "manage_tenant_users",
    "manage_tenant_settings",
  ]),
  HR: new Set<RbacAction>(["manage_consultants_non_financial"]),
  ACCOUNTS: new Set<RbacAction>(["approve_timesheets_edit_rates"]),
  CONSULTANT: new Set<RbacAction>(["view_own_enter_time"]),
};

/**
 * Loads the user and tenant membership, then checks the permission matrix.
 * Platform `SUPER_ADMIN` / `SYSTEM_ADMIN` apply before tenant role.
 */
export async function checkPermission(
  userId: string,
  tenantId: string,
  action: string
): Promise<boolean> {
  if (!ALL_ACTIONS.includes(action as RbacAction)) {
    return false;
  }
  const rbacAction = action as RbacAction;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { platformRole: true },
  });
  if (!user) return false;

  if (user.platformRole === "SUPER_ADMIN") {
    return PLATFORM_MATRIX.SUPER_ADMIN.has(rbacAction);
  }
  if (user.platformRole === "SYSTEM_ADMIN") {
    return PLATFORM_MATRIX.SYSTEM_ADMIN.has(rbacAction);
  }

  const member = await prisma.tenantMember.findUnique({
    where: {
      userId_companyId: { userId, companyId: tenantId },
    },
  });
  if (!member) return false;

  const allowed = TENANT_MATRIX[member.role];
  return allowed.has(rbacAction);
}
