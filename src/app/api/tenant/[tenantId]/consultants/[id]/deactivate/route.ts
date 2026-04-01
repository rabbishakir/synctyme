import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { withRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { scheduleConsultantDeactivation } from "@/lib/jobs";

export const POST = withRole(["HR", "COMPANY_ADMIN", "ACCOUNTS"])(
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

    const body = await req.json().catch(() => ({}));
    const deactivationDateStr =
      typeof body.deactivationDate === "string"
        ? body.deactivationDate
        : null;

    if (!deactivationDateStr) {
      return NextResponse.json(
        { error: "deactivationDate is required" },
        { status: 400 }
      );
    }

    const deactivationDate = new Date(deactivationDateStr);
    if (isNaN(deactivationDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid deactivationDate" },
        { status: 400 }
      );
    }

    const openCycle = await prisma.employmentCycle.findFirst({
      where: { consultantId, closedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (openCycle) {
      await prisma.employmentCycle.update({
        where: { id: openCycle.id },
        data: { deactivationDate, closedAt: new Date() },
      });
    }

    const scheduleAt = new Date(deactivationDate);
    scheduleAt.setHours(0, 1, 0, 0);

    try {
      await scheduleConsultantDeactivation(consultantId, scheduleAt);
    } catch {
      await prisma.consultant.update({
        where: { id: consultantId },
        data: { status: "INACTIVE" },
      });
    }

    const actorMember = await prisma.tenantMember.findUnique({
      where: { userId_companyId: { userId, companyId: tenantId } },
    });

    await writeAuditLog({
      companyId: tenantId,
      userId,
      role: actorMember?.role ?? "HR",
      entity: "Consultant",
      entityId: consultantId,
      action: "CONSULTANT_DEACTIVATION_SCHEDULED",
      newValue: JSON.stringify({
        deactivationDate: deactivationDate.toISOString(),
      }),
      ipAddress:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    });

    return NextResponse.json({ ok: true, deactivationDate });
  }
);
