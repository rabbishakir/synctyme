import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writePlatformAuditLog } from "@/lib/audit";
import { withRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";

export const POST = withRole(["SUPER_ADMIN"])(async (req, context) => {
  const params = await context.params;
  const companyId = params.id;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (!reason) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  if (company.status === "ARCHIVED" || company.status === "DELETED") {
    return NextResponse.json(
      { error: "Company is archived or deleted." },
      { status: 400 }
    );
  }

  const existing = await prisma.deletionRequest.findUnique({
    where: { companyId },
  });
  if (existing?.status === "PENDING") {
    return NextResponse.json(
      { error: "A deletion request is already pending for this company." },
      { status: 409 }
    );
  }
  if (existing) {
    await prisma.deletionRequest.delete({ where: { companyId } });
  }

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  const dr = await prisma.deletionRequest.create({
    data: {
      companyId,
      initiatedBy: userId,
      reason,
      status: "PENDING",
    },
  });

  await prisma.company.update({
    where: { id: companyId },
    data: { status: "PENDING_DELETION" },
  });

  await writePlatformAuditLog({
    action: "DELETION_INITIATED",
    performedBy: userId,
    targetId: companyId,
    metadata: {
      deletionRequestId: dr.id,
      reason,
    },
    ipAddress,
  });

  return NextResponse.json({ deletionRequest: dr }, { status: 201 });
});

export const PATCH = withRole(["SYSTEM_ADMIN"])(async (req, context) => {
  const params = await context.params;
  const companyId = params.id;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const decision = body.decision === "approve" ? "approve" : body.decision === "reject" ? "reject" : null;

  if (!decision) {
    return NextResponse.json(
      { error: "decision must be approve or reject" },
      { status: 400 }
    );
  }

  const dr = await prisma.deletionRequest.findUnique({
    where: { companyId },
  });
  if (!dr || dr.status !== "PENDING") {
    return NextResponse.json(
      { error: "No pending deletion request for this company." },
      { status: 404 }
    );
  }

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  if (decision === "approve") {
    await prisma.$transaction([
      prisma.company.update({
        where: { id: companyId },
        data: { status: "ARCHIVED" },
      }),
      prisma.deletionRequest.update({
        where: { id: dr.id },
        data: {
          status: "APPROVED",
          approvedBy: userId,
          approvedAt: new Date(),
        },
      }),
    ]);

    await writePlatformAuditLog({
      action: "DELETION_APPROVED",
      performedBy: userId,
      targetId: companyId,
      metadata: { deletionRequestId: dr.id },
      ipAddress,
    });

    return NextResponse.json({ ok: true, status: "APPROVED" });
  }

  await prisma.$transaction([
    prisma.company.update({
      where: { id: companyId },
      data: { status: "ACTIVE" },
    }),
    prisma.deletionRequest.update({
      where: { id: dr.id },
      data: {
        status: "REJECTED",
        rejectedBy: userId,
        rejectedAt: new Date(),
      },
    }),
  ]);

  await writePlatformAuditLog({
    action: "DELETION_REJECTED",
    performedBy: userId,
    targetId: companyId,
    metadata: { deletionRequestId: dr.id },
    ipAddress,
  });

  return NextResponse.json({ ok: true, status: "REJECTED" });
});
