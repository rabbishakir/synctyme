import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { withRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { assertTransition, TransitionError } from "@/lib/timesheet/stateMachine";

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
  const rejectionReason =
    typeof body.rejectionReason === "string" ? body.rejectionReason.trim() : "";

  if (!rejectionReason) {
    return NextResponse.json(
      { error: "rejectionReason is required" },
      { status: 400 }
    );
  }

  const timesheet = await prisma.timesheet.findFirst({
    where: { id: timesheetId, companyId: tenantId },
  });

  if (!timesheet) {
    return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
  }

  try {
    assertTransition(timesheet.status, "REJECTED");
  } catch (e) {
    if (e instanceof TransitionError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  const updated = await prisma.timesheet.update({
    where: { id: timesheetId },
    data: {
      status: "REJECTED",
      rejectedBy: userId,
      rejectedAt: new Date(),
      rejectionReason,
    },
  });

  await writeAuditLog({
    companyId: tenantId,
    userId,
    role: "ACCOUNTS",
    entity: "Timesheet",
    entityId: timesheetId,
    action: "TIMESHEET_REJECTED",
    oldValue: "SUBMITTED",
    newValue: "REJECTED",
    field: "rejectionReason",
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
  });

  return NextResponse.json({ timesheet: updated });
});
