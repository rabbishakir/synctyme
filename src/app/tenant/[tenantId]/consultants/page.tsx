import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import ConsultantListClient from "@/components/tenant/ConsultantListClient";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function ConsultantsPage({ params }: PageProps) {
  const { tenantId } = await params;
  const { session, membership } = await requireTenantAccess(tenantId);

  const consultants = await prisma.consultant.findMany({
    where: { companyId: tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      consultantCode: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
      _count: { select: { projects: true } },
    },
  });

  const canAdd = ["COMPANY_ADMIN", "HR"].includes(membership.role);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href={`/tenant/${tenantId}/dashboard`}
              className="text-sm text-blue-600 hover:underline"
            >
              ← Dashboard
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              Consultants
            </h1>
            <p className="text-sm text-gray-500">
              {session.user.email} &middot;{" "}
              {membership.role.replace(/_/g, " ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canAdd && (
              <Link
                href={`/tenant/${tenantId}/consultants/new`}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Add Consultant
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>

        <ConsultantListClient
          consultants={consultants.map((c) => ({
            ...c,
            createdAt: c.createdAt.toISOString(),
            projectCount: c._count.projects,
          }))}
          tenantId={tenantId}
        />
      </div>
    </main>
  );
}
