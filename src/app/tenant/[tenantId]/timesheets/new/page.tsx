import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import NewTimesheetForm from "@/components/tenant/NewTimesheetForm";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function NewTimesheetPage({ params }: PageProps) {
  const { tenantId } = await params;
  const { session } = await requireTenantAccess(tenantId, ["CONSULTANT"]);

  const consultant = await prisma.consultant.findFirst({
    where: { userId: session.user.id, companyId: tenantId, status: "ACTIVE" },
  });

  const projects = consultant
    ? await prisma.project.findMany({
        where: {
          consultantId: consultant.id,
          companyId: tenantId,
          status: "ACTIVE",
        },
        select: { id: true, clientName: true },
        orderBy: { clientName: "asc" },
      })
    : [];

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href={`/tenant/${tenantId}/timesheets`}
              className="text-sm text-blue-600 hover:underline"
            >
              &larr; Timesheets
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              New Timesheet
            </h1>
          </div>
          <LogoutButton />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {projects.length === 0 ? (
            <p className="text-sm text-gray-500">
              No active projects found. You need an active project to create a
              timesheet.
            </p>
          ) : (
            <NewTimesheetForm tenantId={tenantId} projects={projects} />
          )}
        </div>
      </div>
    </main>
  );
}
