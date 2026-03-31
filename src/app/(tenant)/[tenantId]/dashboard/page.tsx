import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";

interface TenantDashboardProps {
  params: Promise<{ tenantId: string }>;
}

export default async function TenantDashboard({ params }: TenantDashboardProps) {
  const { tenantId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const headersList = await headers();
  const tenantRole = headersList.get("x-tenant-role");

  const company = await prisma.company.findUnique({
    where: { id: tenantId },
    include: { settings: true },
  });

  if (!company) notFound();

  const member = await prisma.tenantMember.findUnique({
    where: {
      userId_companyId: { userId: session.user.id, companyId: tenantId },
    },
  });

  const displayRole = tenantRole ?? member?.role ?? "Unknown";

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm text-blue-600 font-medium">Tenant Dashboard</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">{company.name}</h1>
          <p className="mt-2 text-sm text-gray-500">
            Signed in as{" "}
            <span className="font-medium text-gray-700">{session.user.email}</span>{" "}
            &middot;{" "}
            <span className="font-medium text-gray-700">
              {displayRole.replace(/_/g, " ")}
            </span>
          </p>
        </div>

        {/* Status Banner */}
        {company.status !== "ACTIVE" && (
          <div className="mb-6 rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
            This company is currently{" "}
            <strong>{company.status.replace(/_/g, " ").toLowerCase()}</strong>.
          </div>
        )}

        {/* Coming Soon Card */}
        <div className="rounded-xl border border-blue-100 bg-white p-10 text-center shadow-sm">
          <div className="text-5xl mb-4">🚧</div>
          <h2 className="text-xl font-semibold text-gray-800">Stage 2 Coming Soon</h2>
          <p className="mt-2 text-sm text-gray-500">
            Consultant management, timesheets, and more will be available in the next
            stage. Stay tuned!
          </p>
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
