import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
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
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href={`/tenant/${tenantId}/dashboard`}
              className="text-sm text-blue-600 hover:underline"
            >
              &larr; Dashboard
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              Timesheets
            </h1>
            <p className="text-sm text-gray-500">
              {session.user.email} &middot;{" "}
              {membership.role.replace(/_/g, " ")}
            </p>
          </div>
          <LogoutButton />
        </div>

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
      </div>
    </main>
  );
}
