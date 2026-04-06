import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import ProjectDetailClient from "@/components/tenant/ProjectDetailClient";

interface PageProps {
  params: Promise<{ tenantId: string; id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { tenantId, id } = await params;
  const { membership } = await requireTenantAccess(tenantId);

  const project = await prisma.project.findFirst({
    where: { id, companyId: tenantId },
    include: {
      consultant: { select: { id: true, name: true, consultantCode: true } },
      rateHistory: { orderBy: { effectiveDate: "desc" } },
      timesheets: {
        orderBy: { weekStart: "desc" },
        take: 20,
        select: { id: true, weekStart: true, status: true, consultantId: true },
      },
    },
  });

  if (!project) notFound();

  const canChangeRate = membership.role === "ACCOUNTS";

  return (
    <>
      <PageHeader
        title={project.clientName}
        description={`${project.consultant.consultantCode} — ${project.consultant.name} — ${project.status}`}
        breadcrumbs={[
          { label: "Dashboard", href: `/tenant/${tenantId}/dashboard` },
          { label: "Projects", href: `/tenant/${tenantId}/projects` },
          { label: project.clientName },
        ]}
      />

      <ProjectDetailClient
        project={{
          id: project.id,
          clientName: project.clientName,
          clientLocation: project.clientLocation,
          midClient: project.midClient,
          startDate: project.startDate.toISOString(),
          endDate: project.endDate?.toISOString() ?? null,
          workAuthDetails: project.workAuthDetails,
          recruiter: project.recruiter,
          marketer: project.marketer,
          clientApprovedTimesheetRequired: project.clientApprovedTimesheetRequired,
          status: project.status,
          consultant: project.consultant,
        }}
        rateHistory={project.rateHistory.map((r) => ({
          id: r.id,
          payRate: r.payRate.toString(),
          incentiveRate: r.incentiveRate?.toString() ?? null,
          effectiveDate: r.effectiveDate.toISOString(),
          createdAt: r.createdAt.toISOString(),
        }))}
        timesheets={project.timesheets.map((t) => ({
          id: t.id,
          weekStart: t.weekStart.toISOString(),
          status: t.status,
        }))}
        tenantId={tenantId}
        canChangeRate={canChangeRate}
      />
    </>
  );
}
