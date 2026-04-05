import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { withRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { validateEntry } from "@/lib/timesheet/validate";

const VIEW_ROLES = ["COMPANY_ADMIN", "HR", "ACCOUNTS", "CONSULTANT"];

export const GET = withRole(VIEW_ROLES)(async (_req, context) => {
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
      entries: { orderBy: { date: "asc" } },
      consultant: {
        select: {
          id: true,
          name: true,
          consultantCode: true,
          userId: true,
          employmentCycles: { orderBy: { hireDate: "desc" }, take: 1 },
        },
      },
      project: {
        select: {
          id: true,
          clientName: true,
          startDate: true,
          endDate: true,
          clientApprovedTimesheetRequired: true,
          rateHistory: { orderBy: { effectiveDate: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!timesheet) {
    return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
  }

  const member = await prisma.tenantMember.findUnique({
    where: { userId_companyId: { userId, companyId: tenantId } },
  });

  if (member?.role === "CONSULTANT" && timesheet.consultant.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ timesheet });
});

export const PATCH = withRole(["CONSULTANT"])(async (req, context) => {
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
    include: { consultant: { select: { userId: true } } },
  });

  if (!timesheet) {
    return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
  }

  if (timesheet.consultant.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (timesheet.status !== "DRAFT" && timesheet.status !== "REJECTED") {
    return NextResponse.json(
      { error: "Can only edit DRAFT or REJECTED timesheets" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const entries: Array<{ date: string; hours: number; notes?: string }> =
    Array.isArray(body.entries) ? body.entries : [];

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "entries array is required" },
      { status: 400 }
    );
  }

  if (timesheet.isCarryForward && timesheet.carryForwardDates) {
    const allowedDates = new Set(
      (timesheet.carryForwardDates as string[]).map((d) => d.slice(0, 10))
    );
    for (const e of entries) {
      const dateKey = new Date(e.date).toISOString().slice(0, 10);
      if (e.hours > 0 && !allowedDates.has(dateKey)) {
        return NextResponse.json(
          {
            error: `Date ${dateKey} is not in the carry-forward dates. Only these dates are allowed: ${Array.from(allowedDates).join(", ")}`,
          },
          { status: 400 }
        );
      }
    }
  }

  const allErrors: string[] = [];
  for (const e of entries) {
    const result = await validateEntry(
      timesheet.consultantId,
      timesheet.projectId,
      new Date(e.date),
      e.hours
    );
    if (!result.valid) allErrors.push(...result.errors);
  }

  if (allErrors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: allErrors },
      { status: 400 }
    );
  }

  const updatedTimesheet = await prisma.$transaction(async (tx) => {
    await tx.timesheetEntry.deleteMany({ where: { timesheetId } });

    await tx.timesheetEntry.createMany({
      data: entries.map((e) => ({
        timesheetId,
        date: new Date(e.date),
        hours: e.hours,
        notes: e.notes ?? null,
      })),
    });

    if (timesheet.status === "REJECTED") {
      await tx.timesheet.update({
        where: { id: timesheetId },
        data: { status: "DRAFT", rejectedBy: null, rejectedAt: null, rejectionReason: null },
      });
    }

    return tx.timesheet.findUnique({
      where: { id: timesheetId },
      include: { entries: { orderBy: { date: "asc" } } },
    });
  });

  await writeAuditLog({
    companyId: tenantId,
    userId,
    role: "CONSULTANT",
    entity: "Timesheet",
    entityId: timesheetId,
    action: "TIMESHEET_ENTRIES_UPDATED",
    newValue: JSON.stringify(entries),
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
  });

  return NextResponse.json({ timesheet: updatedTimesheet });
});
