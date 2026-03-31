import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { writePlatformAuditLog } from "@/lib/audit";
import { randomBytes } from "crypto";

function generateTempPassword(length = 16): string {
  return randomBytes(length).toString("base64").slice(0, length);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.platformRole) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tenantMembers: true } } },
  });

  return NextResponse.json({ companies });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.platformRole) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.platformRole;
  if (role !== "SUPER_ADMIN" && role !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { companyName, adminEmail, adminName } = body;

  if (!companyName || !adminEmail || !adminName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

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
    // 1. Create Company
    const company = await tx.company.create({
      data: { name: companyName },
    });

    // 2. Create CompanySettings with defaults
    await tx.companySettings.create({
      data: { companyId: company.id },
    });

    // 3. Create User for admin
    const adminUser = await tx.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        mfaEnabled: false,
      },
    });

    // 4. Create TenantMember
    await tx.tenantMember.create({
      data: {
        userId: adminUser.id,
        companyId: company.id,
        role: "COMPANY_ADMIN",
      },
    });

    return { company, adminUser };
  });

  // 5. Write audit log (outside transaction — silent failure is OK)
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
}
