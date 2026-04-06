import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import StatsCard from "@/components/dashboard/StatsCard";
import { Calendar, Users, Briefcase, Clock, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

interface TenantDashboardProps {
  params: Promise<{ tenantId: string }>;
}

export default async function TenantDashboard({ params }: TenantDashboardProps) {
  const { tenantId } = await params;
  const { session, membership } = await requireTenantAccess(tenantId);

  const company = await prisma.company.findUnique({
    where: { id: tenantId },
    include: { settings: true },
  });

  if (!company) notFound();

  const isConsultant = membership.role === "CONSULTANT";
  const isAccounts = membership.role === "ACCOUNTS";

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let stats: { label: string; value: string | number; icon: React.ElementType }[] = [];

  if (isConsultant) {
    const consultant = await prisma.consultant.findFirst({
      where: { userId: session.user.id, companyId: tenantId },
    });
    const consultantId = consultant?.id;

    const monthTimesheets = consultantId
      ? await prisma.timesheet.count({
          where: { consultantId, companyId: tenantId, weekStart: { gte: monthStart } },
        })
      : 0;

    const weekEntries = consultantId
      ? await prisma.timesheetEntry.aggregate({
          where: {
            timesheet: { consultantId, companyId: tenantId },
            date: { gte: weekAgo },
          },
          _sum: { hours: true },
        })
      : { _sum: { hours: null } };

    const pendingCount = consultantId
      ? await prisma.timesheet.count({
          where: { consultantId, companyId: tenantId, status: "DRAFT" },
        })
      : 0;

    const projectCount = consultantId
      ? await prisma.project.count({
          where: { consultantId, companyId: tenantId, status: "ACTIVE" },
        })
      : 0;

    stats = [
      { label: "Timesheets This Month", value: monthTimesheets, icon: Calendar },
      { label: "Hours This Week", value: Number(weekEntries._sum.hours ?? 0).toFixed(1), icon: Clock },
      { label: "Drafts to Submit", value: pendingCount, icon: AlertCircle },
      { label: "Active Projects", value: projectCount, icon: Briefcase },
    ];
  } else {
    const pendingApprovals = await prisma.timesheet.count({
      where: { companyId: tenantId, status: "SUBMITTED" },
    });
    const totalConsultants = await prisma.consultant.count({
      where: { companyId: tenantId, status: "ACTIVE" },
    });
    const activeProjects = await prisma.project.count({
      where: { companyId: tenantId, status: "ACTIVE" },
    });
    const monthEntries = await prisma.timesheetEntry.aggregate({
      where: {
        timesheet: { companyId: tenantId },
        date: { gte: monthStart },
      },
      _sum: { hours: true },
    });

    stats = [
      { label: "Pending Approvals", value: pendingApprovals, icon: CheckCircle },
      { label: "Active Consultants", value: totalConsultants, icon: Users },
      { label: "Active Projects", value: activeProjects, icon: Briefcase },
      { label: "Hours This Month", value: Number(monthEntries._sum.hours ?? 0).toFixed(1), icon: Clock },
    ];
  }

  const quickLinks = [
    { label: "Timesheets", desc: "Track and manage weekly hours", href: `/tenant/${tenantId}/timesheets`, icon: Calendar },
    { label: "Consultants", desc: "View consultant profiles and cycles", href: `/tenant/${tenantId}/consultants`, icon: Users },
    { label: "Projects", desc: "Manage client engagements and rates", href: `/tenant/${tenantId}/projects`, icon: Briefcase },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome back`}
        description={`${company.name} — ${membership.role.replace(/_/g, " ")}`}
      />

      {company.status !== "ACTIVE" && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This company is currently <strong>{company.status.replace(/_/g, " ").toLowerCase()}</strong>.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatsCard key={s.label} label={s.label} value={s.value} icon={s.icon} />
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <link.icon size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">{link.label}</h3>
                <p className="text-xs text-muted-foreground">{link.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
