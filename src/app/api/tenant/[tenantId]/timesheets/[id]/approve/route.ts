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

  const timesheet = await prisma.timesheet.findFirst({
    where: { id: timesheetId, companyId: tenantId },
  });

  if (!timesheet) {
    return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
  }

  try {
    assertTransition(timesheet.status, "APPROVED");
  } catch (e) {
    if (e instanceof TransitionError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  const settings = await prisma.companySettings.findUnique({
    where: { companyId: tenantId },
  });

  const autoLock = settings?.lockingPolicy === "AUTO_LOCK_ON_APPROVAL";
  const finalStatus = autoLock ? "LOCKED" : "APPROVED";

  const updated = await prisma.timesheet.update({
    where: { id: timesheetId },
    data: {
      status: finalStatus,
      approvedBy: userId,
      approvedAt: new Date(),
      ...(autoLock ? { lockedAt: new Date() } : {}),
    },
  });

  await writeAuditLog({
    companyId: tenantId,
    userId,
    role: "ACCOUNTS",
    entity: "Timesheet",
    entityId: timesheetId,
    action: autoLock ? "TIMESHEET_APPROVED_AND_LOCKED" : "TIMESHEET_APPROVED",
    oldValue: "SUBMITTED",
    newValue: finalStatus,
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
  });

  return NextResponse.json({ timesheet: updated });
});
