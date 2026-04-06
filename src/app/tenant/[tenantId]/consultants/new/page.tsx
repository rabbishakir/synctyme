import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import PageHeader from "@/components/layout/PageHeader";
import NewConsultantForm from "@/components/tenant/NewConsultantForm";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function NewConsultantPage({ params }: PageProps) {
  const { tenantId } = await params;
  await requireTenantAccess(tenantId, ["COMPANY_ADMIN", "HR"]);

  return (
    <>
      <PageHeader
        title="Add Consultant"
        description="A consultant code will be generated automatically."
        breadcrumbs={[
          { label: "Dashboard", href: `/tenant/${tenantId}/dashboard` },
          { label: "Consultants", href: `/tenant/${tenantId}/consultants` },
          { label: "New" },
        ]}
      />

      <div className="max-w-xl">
        <NewConsultantForm tenantId={tenantId} />
      </div>
    </>
  );
}
