import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { withRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";

export const POST = withRole(["ACCOUNTS"])(async (req, context) => {
  const params = await context.params;
  const tenantId = params.tenantId;
  const timesheetId = params.id;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dates: string[] = Array.isArray(body.dates) ? body.dates : [];

  if (dates.length === 0) {
    return NextResponse.json(
      { error: "dates array is required" },
      { status: 400 }
    );
  }

  const timesheet = await prisma.timesheet.findFirst({
    where: { id: timesheetId, companyId: tenantId },
  });

  if (!timesheet) {
    return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
  }

  const settings = await prisma.companySettings.findUnique({
    where: { companyId: tenantId },
  });

  if (!settings?.carryForwardEnabled) {
    return NextResponse.json(
      { error: "Carry-forward is not enabled for this company" },
      { status: 400 }
    );
  }

  const nextWeekStart = new Date(timesheet.weekStart);
  nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() + 7);

  const existing = await prisma.timesheet.findUnique({
    where: {
      consultantId_projectId_weekStart: {
        consultantId: timesheet.consultantId,
        projectId: timesheet.projectId,
        weekStart: nextWeekStart,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "A timesheet already exists for the next pay period", timesheetId: existing.id },
      { status: 409 }
    );
  }

  const newTimesheet = await prisma.timesheet.create({
    data: {
      consultantId: timesheet.consultantId,
      projectId: timesheet.projectId,
      companyId: tenantId,
      weekStart: nextWeekStart,
      status: "DRAFT",
      isCarryForward: true,
      originalTimesheetId: timesheetId,
      carryForwardDates: dates,
    },
  });

  await writeAuditLog({
    companyId: tenantId,
    userId,
    role: "ACCOUNTS",
    entity: "Timesheet",
    entityId: newTimesheet.id,
    action: "TIMESHEET_CARRY_FORWARD_CREATED",
    newValue: JSON.stringify({
      originalTimesheetId: timesheetId,
      dates,
      weekStart: nextWeekStart.toISOString(),
    }),
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
  });

  return NextResponse.json({ timesheet: newTimesheet }, { status: 201 });
});
