import Link from "next/link";
import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import LogoutButton from "@/components/auth/LogoutButton";
import UsersSettingsClient from "@/components/tenant/UsersSettingsClient";
import TenantSwitcher from "@/components/tenant/TenantSwitcher";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function TenantUsersSettingsPage({ params }: PageProps) {
  const { tenantId } = await params;
  const { session, membership } = await requireTenantAccess(tenantId);

  const company = await prisma.company.findUnique({
    where: { id: tenantId },
  });
  if (!company) {
    return null;
  }

  const members = await prisma.tenantMember.findMany({
    where: { companyId: tenantId },
    include: { user: { select: { id: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  const canManageUsers = membership.role === "COMPANY_ADMIN";

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Settings</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Users</h1>
            <p className="mt-1 text-sm text-gray-500">{company.name}</p>
            <div className="mt-3 max-w-xs">
              <TenantSwitcher currentTenantId={tenantId} />
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Signed in as{" "}
              <span className="font-medium">{session.user.email}</span>
              {" · "}
              <span className="font-medium">
                {membership.role.replace(/_/g, " ")}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/tenant/${tenantId}/dashboard`}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Dashboard
            </Link>
            <LogoutButton />
          </div>
        </div>

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
      </div>
    </main>
  );
}
