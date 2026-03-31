import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyMFAToken } from "@/lib/auth/mfa";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token, secret } = await req.json();
  if (!token || !secret) {
    return NextResponse.json({ error: "Missing token or secret" }, { status: 400 });
  }

  const valid = verifyMFAToken(secret, token);
  if (!valid) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { mfaSecret: secret, mfaEnabled: true },
  });

  await writeAuditLog({
    userId: session.user.id,
    role: session.user.platformRole ?? "USER",
    entity: "User",
    entityId: session.user.id,
    field: "mfaEnabled",
    oldValue: "false",
    newValue: "true",
    action: "MFA_ENABLED",
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ success: true });
}
