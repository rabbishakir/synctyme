import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/layout/PageHeader";
import NewProjectForm from "@/components/tenant/NewProjectForm";

interface PageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ consultantId?: string }>;
}

export default async function NewProjectPage({ params, searchParams }: PageProps) {
  const { tenantId } = await params;
  const sp = await searchParams;
  const { membership } = await requireTenantAccess(tenantId, ["COMPANY_ADMIN", "HR"]);

  const consultants = await prisma.consultant.findMany({
    where: { companyId: tenantId },
    select: { id: true, name: true, consultantCode: true },
    orderBy: { name: "asc" },
  });

  const isAccounts = membership.role === "ACCOUNTS";

  return (
    <>
      <PageHeader
        title="Add Project"
        description="An initial rate will be created with the project start date."
        breadcrumbs={[
          { label: "Dashboard", href: `/tenant/${tenantId}/dashboard` },
          { label: "Projects", href: `/tenant/${tenantId}/projects` },
          { label: "New" },
        ]}
      />

      <div className="max-w-xl">
        <NewProjectForm
          tenantId={tenantId}
          consultants={consultants}
          defaultConsultantId={sp.consultantId}
          showRateFields={isAccounts}
        />
      </div>
    </>
  );
}
