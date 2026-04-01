import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withRole } from "@/lib/rbac";

const VIEW_ROLES = ["COMPANY_ADMIN", "HR", "ACCOUNTS", "CONSULTANT"];

export const GET = withRole(VIEW_ROLES)(async (_req, context) => {
  const params = await context.params;
  const projectId = params.id;
  const tenantId = params.tenantId;

  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId: tenantId },
    include: {
      consultant: {
        select: { id: true, name: true, consultantCode: true },
      },
      rateHistory: { orderBy: { effectiveDate: "desc" } },
      timesheets: {
        orderBy: { weekStart: "desc" },
        take: 20,
        select: {
          id: true,
          weekStart: true,
          status: true,
          consultantId: true,
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
});
