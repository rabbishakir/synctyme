import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { withRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { getFieldAccess } from "@/lib/flac";

const VIEW_ROLES = ["COMPANY_ADMIN", "HR", "ACCOUNTS", "CONSULTANT"];

export const GET = withRole(VIEW_ROLES)(async (_req, context) => {
  const params = await context.params;
  const consultantId = params.id;
  const tenantId = params.tenantId;

  const consultant = await prisma.consultant.findFirst({
    where: { id: consultantId, companyId: tenantId },
    include: {
      employmentCycles: { orderBy: { createdAt: "desc" } },
      projects: {
        orderBy: { createdAt: "desc" },
        include: {
          rateHistory: { orderBy: { effectiveDate: "desc" }, take: 1 },
        },
      },
      timesheets: {
        orderBy: { weekStart: "desc" },
        take: 10,
        select: {
          id: true,
          weekStart: true,
          status: true,
          projectId: true,
        },
      },
    },
  });

  if (!consultant) {
    return NextResponse.json(
      { error: "Consultant not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ consultant });
});

const EDIT_ROLES = ["COMPANY_ADMIN", "HR", "ACCOUNTS"];

export const PATCH = withRole(EDIT_ROLES)(async (req, context) => {
  const params = await context.params;
  const consultantId = params.id;
  const tenantId = params.tenantId;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actorMember = await prisma.tenantMember.findUnique({
    where: { userId_companyId: { userId, companyId: tenantId } },
  });
  const role = actorMember?.role ?? session.user.platformRole ?? "HR";

  const consultant = await prisma.consultant.findFirst({
    where: { id: consultantId, companyId: tenantId },
  });
  if (!consultant) {
    return NextResponse.json(
      { error: "Consultant not found" },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  const allowedFields = [
    "name",
    "email",
    "phone",
    "hireDate",
    "status",
    "internalTimesheetRequired",
    "notes",
  ];

  const data: Record<string, unknown> = {};
  const changes: { field: string; oldValue: string; newValue: string }[] = [];

  for (const field of allowedFields) {
    if (body[field] === undefined) continue;

    const access = getFieldAccess(role, "ConsultantProfile", field);
    if (access !== "EDIT") continue;

    const oldVal = String(
      (consultant as Record<string, unknown>)[field] ?? ""
    );
    const newVal =
      typeof body[field] === "boolean"
        ? body[field]
        : typeof body[field] === "string"
          ? body[field].trim()
          : body[field];

    data[field] = newVal;
    changes.push({ field, oldValue: oldVal, newValue: String(newVal) });
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No editable fields provided" },
      { status: 400 }
    );
  }

  const updated = await prisma.consultant.update({
    where: { id: consultantId },
    data,
  });

  for (const c of changes) {
    await writeAuditLog({
      companyId: tenantId,
      userId,
      role,
      entity: "Consultant",
      entityId: consultantId,
      field: c.field,
      oldValue: c.oldValue,
      newValue: c.newValue,
      action: "CONSULTANT_UPDATED",
      ipAddress,
    });
  }

  return NextResponse.json({ consultant: updated });
});

export const DELETE = withRole(["COMPANY_ADMIN", "HR"])(
  async (req, context) => {
    const params = await context.params;
    const consultantId = params.id;
    const tenantId = params.tenantId;

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const consultant = await prisma.consultant.findFirst({
      where: { id: consultantId, companyId: tenantId },
    });
    if (!consultant) {
      return NextResponse.json(
        { error: "Consultant not found" },
        { status: 404 }
      );
    }

    await prisma.consultant.update({
      where: { id: consultantId },
      data: { status: "INACTIVE" },
    });

    const actorMember = await prisma.tenantMember.findUnique({
      where: { userId_companyId: { userId, companyId: tenantId } },
    });

    await writeAuditLog({
      companyId: tenantId,
      userId,
      role: actorMember?.role ?? "HR",
      entity: "Consultant",
      entityId: consultantId,
      action: "CONSULTANT_DEACTIVATED",
      ipAddress:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    });

    return NextResponse.json({ ok: true });
  }
);
