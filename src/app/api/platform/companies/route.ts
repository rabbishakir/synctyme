import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { writePlatformAuditLog } from "@/lib/audit";
import { generateTempPassword } from "@/lib/password";
import { withRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";

const PLATFORM_COMPANY_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN"];

export const GET = withRole(PLATFORM_COMPANY_ROLES)(async (_req, _context) => {
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tenantMembers: true } } },
  });

  return NextResponse.json({ companies });
});

export const POST = withRole(PLATFORM_COMPANY_ROLES)(async (req, _context) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const companyName =
    typeof body.companyName === "string" ? body.companyName.trim() : "";
  const adminEmailRaw =
    typeof body.adminEmail === "string" ? body.adminEmail.trim() : "";
  const adminEmail = adminEmailRaw.toLowerCase();
  const adminName =
    typeof body.adminName === "string" ? body.adminName.trim() : "";

  if (!companyName || !adminEmail || !adminName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    // Check if admin email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with that email already exists." },
        { status: 409 }
      );
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hash(tempPassword, 12);

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: companyName },
      });

      await tx.companySettings.create({
        data: { companyId: company.id },
      });

      const adminUser = await tx.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          mfaEnabled: false,
        },
      });

      await tx.tenantMember.create({
        data: {
          userId: adminUser.id,
          companyId: company.id,
          role: "COMPANY_ADMIN",
        },
      });

      return { company, adminUser };
    });

    await writePlatformAuditLog({
      action: "COMPANY_CREATED",
      performedBy: session.user.id,
      targetId: result.company.id,
      metadata: {
        companyName,
        adminEmail,
        adminName,
      },
      ipAddress,
    });

    return NextResponse.json(
      {
        company: result.company,
        adminEmail,
        tempPassword,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/platform/companies]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create company.",
      },
      { status: 500 }
    );
  }
});
