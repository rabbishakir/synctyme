import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { withRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";

const VIEW_ROLES = ["COMPANY_ADMIN", "HR", "ACCOUNTS", "CONSULTANT"];

export const GET = withRole(VIEW_ROLES)(async (req, context) => {
  const params = await context.params;
  const tenantId = params.tenantId;
  const url = new URL(req.url);

  const consultantId = url.searchParams.get("consultantId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;

  const where: Record<string, unknown> = { companyId: tenantId };
  if (consultantId) where.consultantId = consultantId;
  if (status === "ACTIVE" || status === "COMPLETED") where.status = status;

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      consultant: {
        select: { id: true, name: true, consultantCode: true },
      },
      rateHistory: {
        orderBy: { effectiveDate: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({ projects });
});

export const POST = withRole(["COMPANY_ADMIN", "HR"])(async (req, context) => {
  const params = await context.params;
  const tenantId = params.tenantId;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const consultantId =
    typeof body.consultantId === "string" ? body.consultantId : "";
  const clientName =
    typeof body.clientName === "string" ? body.clientName.trim() : "";
  const startDateStr =
    typeof body.startDate === "string" ? body.startDate : "";
  const payRateStr = typeof body.payRate === "string" ? body.payRate : body.payRate;
  const incentiveRateStr =
    body.incentiveRate !== undefined && body.incentiveRate !== null && body.incentiveRate !== ""
      ? body.incentiveRate
      : null;

  if (!consultantId || !clientName || !startDateStr) {
    return NextResponse.json(
      { error: "consultantId, clientName, and startDate are required" },
      { status: 400 }
    );
  }

  const startDate = new Date(startDateStr);
  if (isNaN(startDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid startDate" },
      { status: 400 }
    );
  }

  const payRate = parseFloat(String(payRateStr));
  if (isNaN(payRate) || payRate < 0) {
    return NextResponse.json(
      { error: "Valid payRate is required" },
      { status: 400 }
    );
  }

  const consultant = await prisma.consultant.findFirst({
    where: { id: consultantId, companyId: tenantId },
  });
  if (!consultant) {
    return NextResponse.json(
      { error: "Consultant not found in this company" },
      { status: 404 }
    );
  }

  const incentiveRate = incentiveRateStr !== null
    ? parseFloat(String(incentiveRateStr))
    : null;
  if (incentiveRate !== null && isNaN(incentiveRate)) {
    return NextResponse.json(
      { error: "Invalid incentiveRate" },
      { status: 400 }
    );
  }

  const endDateStr =
    typeof body.endDate === "string" && body.endDate ? body.endDate : null;
  const endDate = endDateStr ? new Date(endDateStr) : null;

  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        consultantId,
        companyId: tenantId,
        clientName,
        clientLocation:
          typeof body.clientLocation === "string"
            ? body.clientLocation.trim()
            : null,
        midClient:
          typeof body.midClient === "string" ? body.midClient.trim() : null,
        startDate,
        endDate,
        workAuthDetails:
          typeof body.workAuthDetails === "string"
            ? body.workAuthDetails.trim()
            : null,
        recruiter:
          typeof body.recruiter === "string" ? body.recruiter.trim() : null,
        marketer:
          typeof body.marketer === "string" ? body.marketer.trim() : null,
        clientApprovedTimesheetRequired:
          typeof body.clientApprovedTimesheetRequired === "boolean"
            ? body.clientApprovedTimesheetRequired
            : false,
        status: "ACTIVE",
      },
    });

    await tx.rateHistory.create({
      data: {
        projectId: p.id,
        payRate,
        incentiveRate,
        effectiveDate: startDate,
        createdBy: userId,
      },
    });

    return p;
  });

  const actorMember = await prisma.tenantMember.findUnique({
    where: { userId_companyId: { userId, companyId: tenantId } },
  });

  await writeAuditLog({
    companyId: tenantId,
    userId,
    role: actorMember?.role ?? "HR",
    entity: "Project",
    entityId: project.id,
    action: "PROJECT_CREATED",
    newValue: JSON.stringify({ clientName, consultantId, payRate }),
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
  });

  return NextResponse.json({ project }, { status: 201 });
});
