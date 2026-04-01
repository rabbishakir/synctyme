import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import ProjectDetailClient from "@/components/tenant/ProjectDetailClient";

interface PageProps {
  params: Promise<{ tenantId: string; id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { tenantId, id } = await params;
  const { session, membership } = await requireTenantAccess(tenantId);

  const project = await prisma.project.findFirst({
    where: { id, companyId: tenantId },
    include: {
      consultant: {
        select: { id: true, name: true, consultantCode: true },
      },
      rateHistory: { orderBy: { effectiveDate: "desc" } },
      timesheets: {
        orderBy: { weekStart: "desc" },
        take: 20,
        select: {
          id: true,
          weekStart: true,
          status: true,
          consultantId: true,
        },
      },
    },
  });

  if (!project) notFound();

  const canChangeRate = membership.role === "ACCOUNTS";

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href={`/tenant/${tenantId}/projects`}
              className="text-sm text-blue-600 hover:underline"
            >
              ← Projects
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              {project.clientName}
            </h1>
            <p className="text-sm text-gray-500">
              {project.consultant.consultantCode} —{" "}
              {project.consultant.name} &middot; {project.status}
            </p>
          </div>
          <LogoutButton />
        </div>

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
            clientApprovedTimesheetRequired:
              project.clientApprovedTimesheetRequired,
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
      </div>
    </main>
  );
}
