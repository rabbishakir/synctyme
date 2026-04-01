import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { withRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { generateConsultantCode } from "@/lib/utils/consultantCode";
import { generateTempPassword } from "@/lib/password";
import { sendEmail } from "@/lib/email";

const VIEW_ROLES = ["COMPANY_ADMIN", "HR", "ACCOUNTS", "CONSULTANT"];

export const GET = withRole(VIEW_ROLES)(async (req, context) => {
  const params = await context.params;
  const tenantId = params.tenantId;
  const url = new URL(req.url);

  const search = url.searchParams.get("search")?.trim() ?? "";
  const status = url.searchParams.get("status") ?? "";

  const where: Record<string, unknown> = { companyId: tenantId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { consultantCode: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status === "ACTIVE" || status === "INACTIVE") {
    where.status = status;
  }

  const consultants = await prisma.consultant.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      consultantCode: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
      _count: { select: { projects: true } },
    },
  });

  return NextResponse.json({ consultants });
});

export const POST = withRole(["COMPANY_ADMIN", "HR"])(async (req, context) => {
  const params = await context.params;
  const tenantId = params.tenantId;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const internalTimesheetRequired =
    typeof body.internalTimesheetRequired === "boolean"
      ? body.internalTimesheetRequired
      : true;

  if (!name || !email || !phone) {
    return NextResponse.json(
      { error: "name, email, and phone are required" },
      { status: 400 }
    );
  }

  const company = await prisma.company.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const consultantCode = await generateConsultantCode(tenantId);

  const existingUser = await prisma.user.findUnique({ where: { email } });

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  const actorMember = await prisma.tenantMember.findUnique({
    where: { userId_companyId: { userId, companyId: tenantId } },
  });
  const actorRole = actorMember?.role ?? "HR";

  if (existingUser) {
    const existingMember = await prisma.tenantMember.findUnique({
      where: {
        userId_companyId: { userId: existingUser.id, companyId: tenantId },
      },
    });

    const result = await prisma.$transaction(async (tx) => {
      if (!existingMember) {
        await tx.tenantMember.create({
          data: {
            userId: existingUser.id,
            companyId: tenantId,
            role: "CONSULTANT",
          },
        });
      }

      return tx.consultant.create({
        data: {
          companyId: tenantId,
          userId: existingUser.id,
          consultantCode,
          name,
          email,
          phone,
          payrollCompany: company.name,
          internalTimesheetRequired,
          status: "INACTIVE",
        },
      });
    });

    await writeAuditLog({
      companyId: tenantId,
      userId,
      role: actorRole,
      entity: "Consultant",
      entityId: result.id,
      action: "CONSULTANT_CREATED",
      newValue: JSON.stringify({ name, email, consultantCode }),
      ipAddress,
    });

    return NextResponse.json({ consultant: result }, { status: 201 });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hash(tempPassword, 12);

  const result = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { email, passwordHash, mfaEnabled: false },
    });

    await tx.tenantMember.create({
      data: {
        userId: newUser.id,
        companyId: tenantId,
        role: "CONSULTANT",
      },
    });

    return tx.consultant.create({
      data: {
        companyId: tenantId,
        userId: newUser.id,
        consultantCode,
        name,
        email,
        phone,
        payrollCompany: company.name,
        internalTimesheetRequired,
        status: "INACTIVE",
      },
    });
  });

  await sendEmail({
    to: email,
    subject: "Your SyncTyme account",
    text: `Hello ${name},\n\nAn account was created for you at ${company.name} on SyncTyme.\n\nSign in with this email and temporary password:\n${tempPassword}\n\nPlease change your password after signing in.`,
  });

  await writeAuditLog({
    companyId: tenantId,
    userId,
    role: actorRole,
    entity: "Consultant",
    entityId: result.id,
    action: "CONSULTANT_CREATED",
    newValue: JSON.stringify({ name, email, consultantCode }),
    ipAddress,
  });

  return NextResponse.json({ consultant: result }, { status: 201 });
});
