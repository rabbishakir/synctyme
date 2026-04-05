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

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await prisma.tenantMember.findUnique({
    where: { userId_companyId: { userId, companyId: tenantId } },
  });
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where: Record<string, unknown> = { companyId: tenantId };

  if (member.role === "CONSULTANT") {
    const consultant = await prisma.consultant.findFirst({
      where: { userId, companyId: tenantId },
    });
    if (!consultant) {
      return NextResponse.json({ timesheets: [] });
    }
    where.consultantId = consultant.id;
  } else {
    const consultantId = url.searchParams.get("consultantId");
    if (consultantId) where.consultantId = consultantId;
  }

  const status = url.searchParams.get("status");
  if (status) where.status = status;

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (from || to) {
    where.weekStart = {};
    if (from) (where.weekStart as Record<string, Date>).gte = new Date(from);
    if (to) (where.weekStart as Record<string, Date>).lte = new Date(to);
  }

  const timesheets = await prisma.timesheet.findMany({
    where,
    orderBy: { weekStart: "desc" },
    include: {
      consultant: { select: { id: true, name: true, consultantCode: true } },
      project: { select: { id: true, clientName: true } },
      entries: true,
    },
  });

  return NextResponse.json({ timesheets });
});

export const POST = withRole(["CONSULTANT"])(async (req, context) => {
  const params = await context.params;
  const tenantId = params.tenantId;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { projectId, weekStart: weekStartStr } = body;

  if (!projectId || !weekStartStr) {
    return NextResponse.json(
      { error: "projectId and weekStart are required" },
      { status: 400 }
    );
  }

  const weekStart = new Date(weekStartStr);
  if (isNaN(weekStart.getTime())) {
    return NextResponse.json({ error: "Invalid weekStart" }, { status: 400 });
  }
  if (weekStart.getUTCDay() !== 0) {
    return NextResponse.json(
      { error: "weekStart must be a Sunday" },
      { status: 400 }
    );
  }

  const consultant = await prisma.consultant.findFirst({
    where: { userId, companyId: tenantId, status: "ACTIVE" },
  });
  if (!consultant) {
    return NextResponse.json(
      { error: "No active consultant profile found" },
      { status: 404 }
    );
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, consultantId: consultant.id, companyId: tenantId, status: "ACTIVE" },
  });
  if (!project) {
    return NextResponse.json(
      { error: "No active project found" },
      { status: 404 }
    );
  }

  const existing = await prisma.timesheet.findUnique({
    where: {
      consultantId_projectId_weekStart: {
        consultantId: consultant.id,
        projectId,
        weekStart,
      },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Timesheet already exists for this week and project", timesheetId: existing.id },
      { status: 409 }
    );
  }

  const timesheet = await prisma.timesheet.create({
    data: {
      consultantId: consultant.id,
      projectId,
      companyId: tenantId,
      weekStart,
      status: "DRAFT",
    },
  });

  await writeAuditLog({
    companyId: tenantId,
    userId,
    role: "CONSULTANT",
    entity: "Timesheet",
    entityId: timesheet.id,
    action: "TIMESHEET_CREATED",
    newValue: JSON.stringify({ projectId, weekStart: weekStartStr }),
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
  });

  return NextResponse.json({ timesheet }, { status: 201 });
});
