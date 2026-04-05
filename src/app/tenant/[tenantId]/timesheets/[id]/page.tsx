import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
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

  const serialized = {
    ...timesheet,
    weekStart: timesheet.weekStart.toISOString(),
    approvedAt: timesheet.approvedAt?.toISOString() ?? null,
    rejectedAt: timesheet.rejectedAt?.toISOString() ?? null,
    reopenedAt: timesheet.reopenedAt?.toISOString() ?? null,
    createdAt: timesheet.createdAt.toISOString(),
    updatedAt: timesheet.updatedAt.toISOString(),
    lockedAt: timesheet.lockedAt?.toISOString() ?? null,
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
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href={`/tenant/${tenantId}/timesheets`}
              className="text-sm text-blue-600 hover:underline"
            >
              &larr; Timesheets
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              Timesheet
            </h1>
            <p className="text-sm text-gray-500">
              {session.user.email} &middot;{" "}
              {membership.role.replace(/_/g, " ")}
            </p>
          </div>
          <LogoutButton />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <TimesheetDetailClient
            timesheet={serialized}
            tenantId={tenantId}
            userRole={membership.role}
            isOwner={isOwner}
          />
        </div>
      </div>
    </main>
  );
}
