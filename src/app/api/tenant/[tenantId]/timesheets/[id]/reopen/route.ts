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
  const reopenReason =
    typeof body.reopenReason === "string" ? body.reopenReason.trim() : "";

  if (!reopenReason) {
    return NextResponse.json(
      { error: "reopenReason is required" },
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
    assertTransition(timesheet.status, "DRAFT");
  } catch (e) {
    if (e instanceof TransitionError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  const updated = await prisma.timesheet.update({
    where: { id: timesheetId },
    data: {
      status: "DRAFT",
      reopenedBy: userId,
      reopenedAt: new Date(),
      reopenReason,
      lockedAt: null,
      approvedBy: null,
      approvedAt: null,
    },
  });

  await writeAuditLog({
    companyId: tenantId,
    userId,
    role: "ACCOUNTS",
    entity: "Timesheet",
    entityId: timesheetId,
    action: "TIMESHEET_REOPENED",
    oldValue: "LOCKED",
    newValue: "DRAFT",
    field: "reopenReason",
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
  });

  return NextResponse.json({ timesheet: updated });
});
