import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Validates membership and returns the tenant role for session updates. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const tenantId = typeof body.tenantId === "string" ? body.tenantId : null;
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  const member = await prisma.tenantMember.findUnique({
    where: {
      userId_companyId: {
        userId: session.user.id,
        companyId: tenantId,
      },
    },
    include: { company: { select: { id: true, name: true } } },
  });

  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    tenantId: member.companyId,
    role: member.role,
    companyName: member.company.name,
  });
}
