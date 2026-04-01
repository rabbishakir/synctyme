import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function HomePage() {
  const session = await auth() as {
    user?: {
      id?: string;
      platformRole?: string | null;
      activeTenantId?: string | null;
    };
  } | null;

  if (!session?.user?.id) redirect("/login");

  // Platform admins go to the company list
  if (session.user.platformRole) {
    redirect("/platform/companies");
  }

  if (session.user.activeTenantId) {
    const active = await prisma.tenantMember.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId: session.user.activeTenantId,
        },
      },
    });
    if (active) {
      redirect(`/tenant/${active.companyId}/dashboard`);
    }
  }

  // Tenant users — find their first tenant membership
  const member = await prisma.tenantMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  if (member) {
    redirect(`/tenant/${member.companyId}/dashboard`);
  }

  // Authenticated but no tenant access
  redirect("/login?error=no-access");
}
