import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/layout/PageHeader";
import NewTimesheetForm from "@/components/tenant/NewTimesheetForm";
import { Calendar } from "lucide-react";

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
    <>
      <PageHeader
        title="New Timesheet"
        description="Select a project and week to create a new timesheet."
        breadcrumbs={[
          { label: "Dashboard", href: `/tenant/${tenantId}/dashboard` },
          { label: "Timesheets", href: `/tenant/${tenantId}/timesheets` },
          { label: "New" },
        ]}
      />

      <div className="max-w-lg">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
              <Calendar size={24} />
            </div>
            <p className="text-sm font-medium text-foreground">No active projects</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You need an active project to create a timesheet.
            </p>
          </div>
        ) : (
          <NewTimesheetForm tenantId={tenantId} projects={projects} />
        )}
      </div>
    </>
  );
}
