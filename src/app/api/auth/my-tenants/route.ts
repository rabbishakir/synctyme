import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.tenantMember.findMany({
    where: { userId: session.user.id },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    tenants: rows.map((r) => ({
      companyId: r.company.id,
      name: r.company.name,
      role: r.role,
    })),
  });
}
