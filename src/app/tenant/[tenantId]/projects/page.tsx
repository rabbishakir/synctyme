import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import ProjectListClient from "@/components/tenant/ProjectListClient";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function ProjectsPage({ params }: PageProps) {
  const { tenantId } = await params;
  const { session, membership } = await requireTenantAccess(tenantId);

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
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href={`/tenant/${tenantId}/dashboard`}
              className="text-sm text-blue-600 hover:underline"
            >
              ← Dashboard
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              Projects
            </h1>
            <p className="text-sm text-gray-500">
              {session.user.email} &middot;{" "}
              {membership.role.replace(/_/g, " ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canAdd && (
              <Link
                href={`/tenant/${tenantId}/projects/new`}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Add Project
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>

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
      </div>
    </main>
  );
}
