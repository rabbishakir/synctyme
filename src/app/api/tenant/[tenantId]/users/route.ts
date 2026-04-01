import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { generateTempPassword } from "@/lib/password";
import { withRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import type { TenantRole } from "@prisma/client";

const TENANT_VIEW_ROLES: string[] = [
  "COMPANY_ADMIN",
  "HR",
  "ACCOUNTS",
  "CONSULTANT",
];

export const GET = withRole(TENANT_VIEW_ROLES)(async (_req, context) => {
  const params = await context.params;
  const tenantId = params.tenantId;

  const members = await prisma.tenantMember.findMany({
    where: { companyId: tenantId },
    include: {
      user: { select: { id: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      role: m.role,
      createdAt: m.createdAt,
    })),
  });
});

const INVITE_ROLES: TenantRole[] = ["HR", "ACCOUNTS", "CONSULTANT"];

export const POST = withRole(["COMPANY_ADMIN"])(async (req, context) => {
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
  const role = body.role as TenantRole;

  if (!name || !email || !role) {
    return NextResponse.json(
      { error: "name, email, and role are required" },
      { status: 400 }
    );
  }

  if (!INVITE_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const link = await prisma.tenantMember.findUnique({
      where: {
        userId_companyId: { userId: existing.id, companyId: tenantId },
      },
    });
    if (link) {
      return NextResponse.json(
        { error: "User is already a member of this company." },
        { status: 409 }
      );
    }

    const tm = await prisma.tenantMember.create({
      data: {
        userId: existing.id,
        companyId: tenantId,
        role,
      },
    });

    const ipExisting =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

    await sendEmail({
      to: email,
      subject: `Access to ${company.name}`,
      text: `Hello ${name},\n\nYou have been added to ${company.name} on SyncTyme with role ${role.replace(/_/g, " ")}.`,
    });

    const inviterExisting = await prisma.tenantMember.findUnique({
      where: {
        userId_companyId: { userId, companyId: tenantId },
      },
    });

    const createdExisting = await prisma.tenantMember.findUnique({
      where: { id: tm.id },
      include: { user: { select: { id: true, email: true } } },
    });

    await writeAuditLog({
      companyId: tenantId,
      userId,
      role: inviterExisting?.role ?? "COMPANY_ADMIN",
      entity: "TenantMember",
      entityId: tm.id,
      action: "USER_ADDED",
      newValue: JSON.stringify({ email, role, name }),
      ipAddress: ipExisting,
    });

    return NextResponse.json(
      { member: createdExisting, tempPassword: null },
      { status: 201 }
    );
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hash(tempPassword, 12);

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  const { tenantMemberId } = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        mfaEnabled: false,
      },
    });

    const tm = await tx.tenantMember.create({
      data: {
        userId: newUser.id,
        companyId: tenantId,
        role,
      },
    });

    return { tenantMemberId: tm.id };
  });

  await sendEmail({
    to: email,
    subject: "Your SyncTyme account",
    text: `Hello ${name},\n\nAn account was created for you. Sign in with this email and temporary password:\n\n${tempPassword}\n\nPlease change your password after signing in.`,
  });

  const inviter = await prisma.tenantMember.findUnique({
    where: {
      userId_companyId: { userId, companyId: tenantId },
    },
  });

  const created = await prisma.tenantMember.findUnique({
    where: { id: tenantMemberId },
    include: { user: { select: { id: true, email: true } } },
  });

  await writeAuditLog({
    companyId: tenantId,
    userId,
    role: inviter?.role ?? "COMPANY_ADMIN",
    entity: "TenantMember",
    entityId: tenantMemberId,
    action: "USER_INVITED",
    newValue: JSON.stringify({ email, role, name }),
    ipAddress,
  });

  return NextResponse.json(
    {
      member: created,
      tempPassword,
    },
    { status: 201 }
  );
});
