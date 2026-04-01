import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import ConsultantDetailClient from "@/components/tenant/ConsultantDetailClient";

interface PageProps {
  params: Promise<{ tenantId: string; id: string }>;
}

export default async function ConsultantDetailPage({ params }: PageProps) {
  const { tenantId, id } = await params;
  const { session, membership } = await requireTenantAccess(tenantId);

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
  const canDeactivate = ["HR", "COMPANY_ADMIN", "ACCOUNTS"].includes(
    membership.role
  );
  const canRehire = ["HR", "ACCOUNTS"].includes(membership.role);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href={`/tenant/${tenantId}/consultants`}
              className="text-sm text-blue-600 hover:underline"
            >
              ← Consultants
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              {consultant.name}
            </h1>
            <p className="text-sm text-gray-500">
              {consultant.consultantCode} &middot; {consultant.status}
            </p>
          </div>
          <LogoutButton />
        </div>

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
      </div>
    </main>
  );
}
