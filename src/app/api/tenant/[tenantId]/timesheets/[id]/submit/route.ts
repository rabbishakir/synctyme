import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { withRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { validateWeek } from "@/lib/timesheet/validate";
import { assertTransition, TransitionError } from "@/lib/timesheet/stateMachine";

export const POST = withRole(["CONSULTANT"])(async (req, context) => {
  const params = await context.params;
  const tenantId = params.tenantId;
  const timesheetId = params.id;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const timesheet = await prisma.timesheet.findFirst({
    where: { id: timesheetId, companyId: tenantId },
    include: {
      entries: true,
      consultant: { select: { userId: true } },
      project: { select: { clientApprovedTimesheetRequired: true } },
    },
  });

  if (!timesheet) {
    return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
  }

  if (timesheet.consultant.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    assertTransition(timesheet.status, "SUBMITTED");
  } catch (e) {
    if (e instanceof TransitionError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  if (timesheet.entries.length === 0) {
    return NextResponse.json(
      { error: "Cannot submit a timesheet with no entries" },
      { status: 400 }
    );
  }

  if (timesheet.project.clientApprovedTimesheetRequired && !timesheet.uploadedFileUrl) {
    return NextResponse.json(
      { error: "Client-approved timesheet file is required for this project" },
      { status: 400 }
    );
  }

  const validation = await validateWeek(
    timesheet.consultantId,
    timesheet.projectId,
    timesheet.weekStart,
    timesheet.entries.map((e) => ({ date: e.date, hours: Number(e.hours) }))
  );

  if (!validation.valid) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.errors },
      { status: 400 }
    );
  }

  const updated = await prisma.timesheet.update({
    where: { id: timesheetId },
    data: { status: "SUBMITTED" },
  });

  await writeAuditLog({
    companyId: tenantId,
    userId,
    role: "CONSULTANT",
    entity: "Timesheet",
    entityId: timesheetId,
    action: "TIMESHEET_SUBMITTED",
    oldValue: "DRAFT",
    newValue: "SUBMITTED",
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
  });

  return NextResponse.json({ timesheet: updated });
});
