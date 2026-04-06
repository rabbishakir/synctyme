import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}

export default async function TenantLayout({ children, params }: LayoutProps) {
  const { tenantId } = await params;
  const { session, membership } = await requireTenantAccess(tenantId);

  const company = await prisma.company.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  if (!company) notFound();

  return (
    <AppShell
      tenantId={tenantId}
      companyName={company.name}
      userEmail={session.user.email ?? ""}
      userRole={membership.role}
    >
      {children}
    </AppShell>
  );
}
