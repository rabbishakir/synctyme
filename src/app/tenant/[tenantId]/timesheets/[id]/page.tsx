import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import TimesheetDetailClient from "@/components/tenant/TimesheetDetailClient";

interface PageProps {
  params: Promise<{ tenantId: string; id: string }>;
}

export default async function TimesheetDetailPage({ params }: PageProps) {
  const { tenantId, id } = await params;
  const { session, membership } = await requireTenantAccess(tenantId);

  const timesheet = await prisma.timesheet.findFirst({
    where: { id, companyId: tenantId },
    include: {
      entries: { orderBy: { date: "asc" } },
      consultant: {
        select: {
          id: true,
          name: true,
          consultantCode: true,
          userId: true,
          employmentCycles: {
            orderBy: { hireDate: "desc" },
            take: 1,
          },
        },
      },
      project: {
        select: {
          id: true,
          clientName: true,
          startDate: true,
          endDate: true,
          clientApprovedTimesheetRequired: true,
          rateHistory: {
            orderBy: { effectiveDate: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!timesheet) notFound();

  if (
    membership.role === "CONSULTANT" &&
    timesheet.consultant.userId !== session.user.id
  ) {
    notFound();
  }

  const isOwner = timesheet.consultant.userId === session.user.id;

  const weekEnd = new Date(timesheet.weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const weekLabel = `${fmt(timesheet.weekStart)} – ${fmt(weekEnd)}`;

  const serialized = {
    ...timesheet,
    weekStart: timesheet.weekStart.toISOString(),
    approvedAt: timesheet.approvedAt?.toISOString() ?? null,
    rejectedAt: timesheet.rejectedAt?.toISOString() ?? null,
    reopenedAt: timesheet.reopenedAt?.toISOString() ?? null,
    createdAt: timesheet.createdAt.toISOString(),
    updatedAt: timesheet.updatedAt.toISOString(),
    lockedAt: timesheet.lockedAt?.toISOString() ?? null,
    carryForwardDates: (timesheet.carryForwardDates as string[] | null) ?? null,
    entries: timesheet.entries.map((e) => ({
      date: e.date.toISOString(),
      hours: Number(e.hours),
      notes: e.notes,
    })),
    consultant: {
      ...timesheet.consultant,
      employmentCycles: timesheet.consultant.employmentCycles.map((c) => ({
        hireDate: c.hireDate.toISOString(),
        deactivationDate: c.deactivationDate?.toISOString() ?? null,
      })),
    },
    project: {
      ...timesheet.project,
      startDate: timesheet.project.startDate.toISOString(),
      endDate: timesheet.project.endDate?.toISOString() ?? null,
      rateHistory: timesheet.project.rateHistory.map((r) => ({
        payRate: r.payRate.toString(),
        effectiveDate: r.effectiveDate.toISOString(),
      })),
    },
  };

  return (
    <>
      <PageHeader
        title={weekLabel}
        description={`${timesheet.project.clientName} — ${timesheet.consultant.name}`}
        breadcrumbs={[
          { label: "Dashboard", href: `/tenant/${tenantId}/dashboard` },
          { label: "Timesheets", href: `/tenant/${tenantId}/timesheets` },
          { label: weekLabel },
        ]}
      />

      <TimesheetDetailClient
        timesheet={serialized}
        tenantId={tenantId}
        userRole={membership.role}
        isOwner={isOwner}
      />
    </>
  );
}
