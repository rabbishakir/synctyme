import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import LogoutButton from "@/components/auth/LogoutButton";
import TenantSwitcher from "@/components/tenant/TenantSwitcher";
import Link from "next/link";

interface TenantDashboardProps {
  params: Promise<{ tenantId: string }>;
}

export default async function TenantDashboard({ params }: TenantDashboardProps) {
  const { tenantId } = await params;

  // Verifies session + TenantMember in one call — redirects if either fails
  const { session, membership } = await requireTenantAccess(tenantId);

  const headersList = await headers();
  const clientIp = headersList.get("x-client-ip") ?? "unknown";

  const company = await prisma.company.findUnique({
    where: { id: tenantId },
    include: { settings: true },
  });

  if (!company) notFound();

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <p className="text-sm text-blue-600 font-medium">Tenant Dashboard</p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">{company.name}</h1>
            <div className="mt-3">
              <TenantSwitcher currentTenantId={tenantId} />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Signed in as{" "}
              <span className="font-medium text-gray-700">{session.user.email}</span>
              {" "}&middot;{" "}
              <span className="font-medium text-gray-700">
                {membership.role.replace(/_/g, " ")}
              </span>
            </p>
            <p className="mt-1 text-xs text-gray-400">IP: {clientIp}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/tenant/${tenantId}/consultants`}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Consultants
            </Link>
            <Link
              href={`/tenant/${tenantId}/projects`}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Projects
            </Link>
            <Link
              href={`/tenant/${tenantId}/settings/users`}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Users
            </Link>
            <Link
              href="/tenant-selector"
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              All companies
            </Link>
            <LogoutButton />
          </div>
        </div>

        {/* Status Banner */}
        {company.status !== "ACTIVE" && (
          <div className="mb-6 rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
            This company is currently{" "}
            <strong>{company.status.replace(/_/g, " ").toLowerCase()}</strong>.
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href={`/tenant/${tenantId}/consultants`}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-blue-200 hover:shadow transition"
          >
            <h2 className="text-lg font-semibold text-gray-800">Consultants</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage consultant profiles, employment cycles, and activation.
            </p>
          </Link>
          <Link
            href={`/tenant/${tenantId}/projects`}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-blue-200 hover:shadow transition"
          >
            <h2 className="text-lg font-semibold text-gray-800">Projects</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage client projects, rate history, and timesheets.
            </p>
          </Link>
        </div>

        {/* Company Info */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
            <p className="mt-1 text-lg font-semibold text-gray-800">
              {company.status.replace(/_/g, " ")}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Pay Period</p>
            <p className="mt-1 text-lg font-semibold text-gray-800">
              {company.settings?.payPeriodStructure?.replace(/_/g, " ") ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Tenant ID</p>
            <p className="mt-1 font-mono text-xs text-gray-600 break-all">{tenantId}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
