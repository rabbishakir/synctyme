import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { generateTempPassword } from "@/lib/password";
import { withRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";

export const POST = withRole(["COMPANY_ADMIN"])(async (req, context) => {
  const params = await context.params;
  const tenantId = params.tenantId;
  const targetUserId = params.userId;

  const session = await auth();
  const actorId = session?.user?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.tenantMember.findUnique({
    where: {
      userId_companyId: {
        userId: targetUserId,
        companyId: tenantId,
      },
    },
    include: { user: { select: { email: true } } },
  });

  if (!membership) {
    return NextResponse.json({ error: "User not found in tenant" }, { status: 404 });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hash(tempPassword, 12);

  await prisma.user.update({
    where: { id: targetUserId },
    data: { passwordHash },
  });

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  await sendEmail({
    to: membership.user.email,
    subject: "Your SyncTyme password was reset",
    text: `A temporary password was generated for your account:\n\n${tempPassword}\n\nPlease sign in and change your password.`,
  });

  const inviter = await prisma.tenantMember.findUnique({
    where: {
      userId_companyId: { userId: actorId, companyId: tenantId },
    },
  });

  await writeAuditLog({
    companyId: tenantId,
    userId: actorId,
    role: inviter?.role ?? "COMPANY_ADMIN",
    entity: "User",
    entityId: targetUserId,
    action: "PASSWORD_RESET",
    ipAddress,
  });

  return NextResponse.json({ ok: true, tempPassword });
});
