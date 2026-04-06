import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import ProjectListClient from "@/components/tenant/ProjectListClient";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function ProjectsPage({ params }: PageProps) {
  const { tenantId } = await params;
  const { membership } = await requireTenantAccess(tenantId);

  const projects = await prisma.project.findMany({
    where: { companyId: tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      consultant: {
        select: { id: true, name: true, consultantCode: true },
      },
      rateHistory: {
        orderBy: { effectiveDate: "desc" },
        take: 1,
      },
    },
  });

  const consultants = await prisma.consultant.findMany({
    where: { companyId: tenantId },
    select: { id: true, name: true, consultantCode: true },
    orderBy: { name: "asc" },
  });

  const canAdd = ["COMPANY_ADMIN", "HR"].includes(membership.role);

  return (
    <>
      <PageHeader
        title="Projects"
        description="Manage client projects, rate history, and assignments."
        breadcrumbs={[
          { label: "Dashboard", href: `/tenant/${tenantId}/dashboard` },
          { label: "Projects" },
        ]}
        actions={
          canAdd ? (
            <Link href={`/tenant/${tenantId}/projects/new`}>
              <Button size="sm">
                <Plus size={16} data-icon="inline-start" />
                Add Project
              </Button>
            </Link>
          ) : undefined
        }
      />

      <ProjectListClient
        projects={projects.map((p) => ({
          id: p.id,
          clientName: p.clientName,
          consultantName: p.consultant.name,
          consultantCode: p.consultant.consultantCode,
          status: p.status,
          startDate: p.startDate.toISOString(),
          endDate: p.endDate?.toISOString() ?? null,
        }))}
        consultants={consultants}
        tenantId={tenantId}
      />
    </>
  );
}
