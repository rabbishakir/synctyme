import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import ConsultantListClient from "@/components/tenant/ConsultantListClient";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function ConsultantsPage({ params }: PageProps) {
  const { tenantId } = await params;
  const { membership } = await requireTenantAccess(tenantId);

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
    <>
      <PageHeader
        title="Consultants"
        description="Manage consultant profiles and employment cycles."
        breadcrumbs={[
          { label: "Dashboard", href: `/tenant/${tenantId}/dashboard` },
          { label: "Consultants" },
        ]}
        actions={
          canAdd ? (
            <Link href={`/tenant/${tenantId}/consultants/new`}>
              <Button size="sm">
                <Plus size={16} data-icon="inline-start" />
                Add Consultant
              </Button>
            </Link>
          ) : undefined
        }
      />

      <ConsultantListClient
        consultants={consultants.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          projectCount: c._count.projects,
        }))}
        tenantId={tenantId}
      />
    </>
  );
}
