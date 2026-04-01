import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { withRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";

export const POST = withRole(["HR", "ACCOUNTS"])(async (req, context) => {
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
  const rehireReason =
    typeof body.rehireReason === "string" ? body.rehireReason.trim() : "";
  const hireDateStr =
    typeof body.hireDate === "string" ? body.hireDate : null;
  const hireDate = hireDateStr ? new Date(hireDateStr) : new Date();

  if (!rehireReason) {
    return NextResponse.json(
      { error: "rehireReason is required" },
      { status: 400 }
    );
  }

  if (isNaN(hireDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid hireDate" },
      { status: 400 }
    );
  }

  await prisma.employmentCycle.updateMany({
    where: { consultantId, closedAt: null },
    data: { closedAt: new Date() },
  });

  const [cycle] = await prisma.$transaction([
    prisma.employmentCycle.create({
      data: { consultantId, hireDate, rehireReason },
    }),
    prisma.consultant.update({
      where: { id: consultantId },
      data: { status: "ACTIVE" },
    }),
  ]);

  const actorMember = await prisma.tenantMember.findUnique({
    where: { userId_companyId: { userId, companyId: tenantId } },
  });

  await writeAuditLog({
    companyId: tenantId,
    userId,
    role: actorMember?.role ?? "HR",
    entity: "Consultant",
    entityId: consultantId,
    action: "CONSULTANT_REHIRED",
    newValue: JSON.stringify({
      rehireReason,
      hireDate: hireDate.toISOString(),
      cycleId: cycle.id,
    }),
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
  });

  return NextResponse.json({ employmentCycle: cycle }, { status: 201 });
});
