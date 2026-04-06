import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/layout/PageHeader";
import TimesheetListClient from "@/components/tenant/TimesheetListClient";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function TimesheetsPage({ params }: PageProps) {
  const { tenantId } = await params;
  const { session, membership } = await requireTenantAccess(tenantId);

  const isConsultant = membership.role === "CONSULTANT";

  const where: Record<string, unknown> = { companyId: tenantId };
  if (isConsultant) {
    const consultant = await prisma.consultant.findFirst({
      where: { userId: session.user.id, companyId: tenantId },
    });
    if (consultant) {
      where.consultantId = consultant.id;
    } else {
      where.consultantId = "__none__";
    }
  }

  const timesheets = await prisma.timesheet.findMany({
    where,
    orderBy: { weekStart: "desc" },
    include: {
      consultant: { select: { id: true, name: true, consultantCode: true } },
      project: { select: { id: true, clientName: true } },
      entries: true,
    },
  });

  const consultants = isConsultant
    ? []
    : await prisma.consultant.findMany({
        where: { companyId: tenantId },
        select: { id: true, name: true, consultantCode: true },
        orderBy: { name: "asc" },
      });

  return (
    <>
      <PageHeader
        title="Timesheets"
        description="Track, submit, and manage weekly timesheets."
        breadcrumbs={[
          { label: "Dashboard", href: `/tenant/${tenantId}/dashboard` },
          { label: "Timesheets" },
        ]}
      />

      <TimesheetListClient
        timesheets={timesheets.map((t) => ({
          id: t.id,
          weekStart: t.weekStart.toISOString(),
          status: t.status,
          totalHours: t.entries.reduce(
            (sum, e) => sum + Number(e.hours),
            0
          ),
          consultantName: t.consultant.name,
          consultantCode: t.consultant.consultantCode,
          clientName: t.project.clientName,
        }))}
        consultants={consultants}
        tenantId={tenantId}
        canCreate={isConsultant}
        showConsultantFilter={!isConsultant}
      />
    </>
  );
}
