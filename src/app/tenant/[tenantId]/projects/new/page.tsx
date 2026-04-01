import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import NewProjectForm from "@/components/tenant/NewProjectForm";

interface PageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ consultantId?: string }>;
}

export default async function NewProjectPage({
  params,
  searchParams,
}: PageProps) {
  const { tenantId } = await params;
  const sp = await searchParams;
  const { membership } = await requireTenantAccess(tenantId, [
    "COMPANY_ADMIN",
    "HR",
  ]);

  const consultants = await prisma.consultant.findMany({
    where: { companyId: tenantId },
    select: { id: true, name: true, consultantCode: true },
    orderBy: { name: "asc" },
  });

  const isAccounts = membership.role === "ACCOUNTS";

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/tenant/${tenantId}/projects`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Projects
          </Link>
          <LogoutButton />
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Add Project</h1>
        <p className="mt-1 text-sm text-gray-500">
          An initial rate will be created with the project start date.
        </p>

        <div className="mt-6">
          <NewProjectForm
            tenantId={tenantId}
            consultants={consultants}
            defaultConsultantId={sp.consultantId}
            showRateFields={isAccounts}
          />
        </div>
      </div>
    </main>
  );
}
