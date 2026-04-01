import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { withRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";

export const POST = withRole(["ACCOUNTS"])(async (req, context) => {
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

  if (consultant.status === "ACTIVE") {
    return NextResponse.json(
      { error: "Consultant is already active" },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const hireDateStr =
    typeof body.hireDate === "string" ? body.hireDate : null;
  const hireDate = hireDateStr ? new Date(hireDateStr) : new Date();

  if (isNaN(hireDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid hireDate" },
      { status: 400 }
    );
  }

  const [cycle] = await prisma.$transaction([
    prisma.employmentCycle.create({
      data: { consultantId, hireDate },
    }),
    prisma.consultant.update({
      where: { id: consultantId },
      data: { status: "ACTIVE" },
    }),
  ]);

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  await writeAuditLog({
    companyId: tenantId,
    userId,
    role: "ACCOUNTS",
    entity: "Consultant",
    entityId: consultantId,
    action: "CONSULTANT_ACTIVATED",
    newValue: JSON.stringify({ hireDate: hireDate.toISOString(), cycleId: cycle.id }),
    ipAddress,
  });

  return NextResponse.json({ employmentCycle: cycle }, { status: 201 });
});
