import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { withRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";

export const POST = withRole(["ACCOUNTS"])(async (req, context) => {
  const params = await context.params;
  const projectId = params.id;
  const tenantId = params.tenantId;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId: tenantId },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  const payRateStr = body.payRate;
  const incentiveRateStr =
    body.incentiveRate !== undefined &&
    body.incentiveRate !== null &&
    body.incentiveRate !== ""
      ? body.incentiveRate
      : null;
  const effectiveDateStr =
    typeof body.effectiveDate === "string" ? body.effectiveDate : "";

  if (!effectiveDateStr) {
    return NextResponse.json(
      { error: "effectiveDate is required" },
      { status: 400 }
    );
  }

  const effectiveDate = new Date(effectiveDateStr);
  if (isNaN(effectiveDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid effectiveDate" },
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

  const incentiveRate =
    incentiveRateStr !== null ? parseFloat(String(incentiveRateStr)) : null;
  if (incentiveRate !== null && isNaN(incentiveRate)) {
    return NextResponse.json(
      { error: "Invalid incentiveRate" },
      { status: 400 }
    );
  }

  const rate = await prisma.rateHistory.create({
    data: {
      projectId,
      payRate,
      incentiveRate,
      effectiveDate,
      createdBy: userId,
    },
  });

  await writeAuditLog({
    companyId: tenantId,
    userId,
    role: "ACCOUNTS",
    entity: "RateHistory",
    entityId: rate.id,
    action: "RATE_ADDED",
    newValue: JSON.stringify({ payRate, incentiveRate, effectiveDate }),
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
  });

  return NextResponse.json({ rate }, { status: 201 });
});
