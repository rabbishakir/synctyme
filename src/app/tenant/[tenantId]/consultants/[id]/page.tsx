import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import ConsultantDetailClient from "@/components/tenant/ConsultantDetailClient";

interface PageProps {
  params: Promise<{ tenantId: string; id: string }>;
}

export default async function ConsultantDetailPage({ params }: PageProps) {
  const { tenantId, id } = await params;
  const { membership } = await requireTenantAccess(tenantId);

  const consultant = await prisma.consultant.findFirst({
    where: { id, companyId: tenantId },
    include: {
      employmentCycles: { orderBy: { createdAt: "desc" } },
      projects: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          clientName: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      },
      timesheets: {
        orderBy: { weekStart: "desc" },
        take: 10,
        select: {
          id: true,
          weekStart: true,
          status: true,
          projectId: true,
        },
      },
    },
  });

  if (!consultant) notFound();

  const canEdit = ["HR", "ACCOUNTS"].includes(membership.role);
  const canActivate = membership.role === "ACCOUNTS";
  const canDeactivate = ["HR", "COMPANY_ADMIN", "ACCOUNTS"].includes(membership.role);
  const canRehire = ["HR", "ACCOUNTS"].includes(membership.role);

  return (
    <>
      <PageHeader
        title={consultant.name}
        description={`${consultant.consultantCode} — ${consultant.status}`}
        breadcrumbs={[
          { label: "Dashboard", href: `/tenant/${tenantId}/dashboard` },
          { label: "Consultants", href: `/tenant/${tenantId}/consultants` },
          { label: consultant.name },
        ]}
      />

      <ConsultantDetailClient
        consultant={{
          id: consultant.id,
          consultantCode: consultant.consultantCode,
          name: consultant.name,
          email: consultant.email,
          phone: consultant.phone,
          payrollCompany: consultant.payrollCompany,
          internalTimesheetRequired: consultant.internalTimesheetRequired,
          status: consultant.status,
          notes: consultant.notes,
        }}
        employmentCycles={consultant.employmentCycles.map((ec) => ({
          id: ec.id,
          hireDate: ec.hireDate.toISOString(),
          deactivationDate: ec.deactivationDate?.toISOString() ?? null,
          rehireReason: ec.rehireReason,
          closedAt: ec.closedAt?.toISOString() ?? null,
        }))}
        projects={consultant.projects.map((p) => ({
          id: p.id,
          clientName: p.clientName,
          status: p.status,
          startDate: p.startDate.toISOString(),
          endDate: p.endDate?.toISOString() ?? null,
        }))}
        timesheets={consultant.timesheets.map((t) => ({
          id: t.id,
          weekStart: t.weekStart.toISOString(),
          status: t.status,
          projectId: t.projectId,
        }))}
        tenantId={tenantId}
        role={membership.role}
        canEdit={canEdit}
        canActivate={canActivate}
        canDeactivate={canDeactivate}
        canRehire={canRehire}
      />
    </>
  );
}
