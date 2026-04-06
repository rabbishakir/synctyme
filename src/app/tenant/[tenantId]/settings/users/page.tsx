import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/layout/PageHeader";
import UsersSettingsClient from "@/components/tenant/UsersSettingsClient";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function TenantUsersSettingsPage({ params }: PageProps) {
  const { tenantId } = await params;
  const { membership } = await requireTenantAccess(tenantId);

  const company = await prisma.company.findUnique({ where: { id: tenantId } });
  if (!company) return null;

  const members = await prisma.tenantMember.findMany({
    where: { companyId: tenantId },
    include: { user: { select: { id: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  const canManageUsers = membership.role === "COMPANY_ADMIN";

  return (
    <>
      <PageHeader
        title="Users"
        description={`Manage team members for ${company.name}.`}
        breadcrumbs={[
          { label: "Dashboard", href: `/tenant/${tenantId}/dashboard` },
          { label: "Settings" },
          { label: "Users" },
        ]}
      />

      <UsersSettingsClient
        tenantId={tenantId}
        canManageUsers={canManageUsers}
        initialMembers={members.map((m) => ({
          id: m.id,
          userId: m.userId,
          email: m.user.email,
          role: m.role,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
