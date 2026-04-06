import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, CheckCircle2, AlertCircle, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/layout/PageHeader";
import StatsCard from "@/components/dashboard/StatsCard";
import CompanyListClient from "@/components/platform/CompanyListClient";

export default async function CompaniesPage() {
  const session = await auth();
  if (!session?.user?.platformRole) redirect("/login");

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tenantMembers: true } } },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter((c) => c.status === "ACTIVE").length;
  const pendingDeletion = companies.filter((c) => c.status === "PENDING_DELETION").length;
  const thisMonth = companies.filter((c) => new Date(c.createdAt) >= monthStart).length;

  const serialized = companies.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status as string,
    createdAt: c.createdAt.toISOString(),
    memberCount: c._count.tenantMembers,
  }));

  return (
    <>
      <PageHeader
        title="Companies"
        description={`${totalCompanies} tenant${totalCompanies !== 1 ? "s" : ""} · Platform Admin`}
        breadcrumbs={[
          { label: "Platform", href: "/platform/companies" },
          { label: "Companies" },
        ]}
        actions={
          <Link href="/platform/companies/new">
            <Button size="sm">
              <Plus size={16} className="mr-1.5" />
              Create Company
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatsCard label="Total Companies" value={totalCompanies} icon={Building2} />
        <StatsCard label="Active" value={activeCompanies} icon={CheckCircle2} />
        <StatsCard label="Pending Deletion" value={pendingDeletion} icon={AlertCircle} />
        <StatsCard label="Created This Month" value={thisMonth} icon={TrendingUp} />
      </div>

      <CompanyListClient
        companies={serialized}
        platformRole={session.user.platformRole}
      />
    </>
  );
}
