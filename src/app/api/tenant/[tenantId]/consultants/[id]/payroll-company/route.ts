import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { withRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";

export const PATCH = withRole(["COMPANY_ADMIN"])(async (req, context) => {
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
  const payrollCompany =
    typeof body.payrollCompany === "string"
      ? body.payrollCompany.trim()
      : null;

  if (!payrollCompany) {
    return NextResponse.json(
      { error: "payrollCompany is required" },
      { status: 400 }
    );
  }

  const oldValue = consultant.payrollCompany;

  await prisma.consultant.update({
    where: { id: consultantId },
    data: { payrollCompany },
  });

  await writeAuditLog({
    companyId: tenantId,
    userId,
    role: "COMPANY_ADMIN",
    entity: "Consultant",
    entityId: consultantId,
    field: "payrollCompany",
    oldValue,
    newValue: payrollCompany,
    action: "PAYROLL_COMPANY_UPDATED",
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
  });

  return NextResponse.json({ ok: true, payrollCompany });
});
