import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { CompanyStatus } from "@prisma/client";
import LogoutButton from "@/components/auth/LogoutButton";

const STATUS_STYLES: Record<CompanyStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-yellow-100 text-yellow-700",
  PENDING_DELETION: "bg-orange-100 text-orange-700",
  ARCHIVED: "bg-gray-100 text-gray-600",
  DELETED: "bg-red-100 text-red-600",
};

interface CompaniesPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const session = await auth();
  if (!session?.user?.platformRole) redirect("/login");

  const { status } = await searchParams;
  const statusFilter = status as CompanyStatus | undefined;

  const companies = await prisma.company.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tenantMembers: true } } },
  });

  const allStatuses: CompanyStatus[] = [
    "ACTIVE",
    "SUSPENDED",
    "PENDING_DELETION",
    "ARCHIVED",
  ];

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
            <p className="mt-1 text-sm text-gray-500">
              {companies.length} tenant{companies.length !== 1 ? "s" : ""} found
              {" · "}
              <span className="text-gray-400">{session.user.email}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LogoutButton />
            <Link
              href="/platform/companies/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              + Create Company
            </Link>
          </div>
        </div>

        {/* Status Filter */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            href="/platform/companies"
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              !statusFilter
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            All
          </Link>
          {allStatuses.map((s) => (
            <Link
              key={s}
              href={`/platform/companies?status=${s}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                statusFilter === s
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s.replace(/_/g, " ")}
            </Link>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p className="text-sm">No companies found.</p>
              <Link
                href="/platform/companies/new"
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Create your first company
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Members
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {company.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[company.status]}`}
                      >
                        {company.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {company._count.tenantMembers}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(company.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <Link
                        href={`/tenant/${company.id}/dashboard`}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                      {(session.user.platformRole === "SUPER_ADMIN" ||
                        (session.user.platformRole === "SYSTEM_ADMIN" &&
                          company.status === "PENDING_DELETION")) && (
                        <Link
                          href={`/platform/companies/${company.id}/delete`}
                          className="text-amber-700 hover:underline"
                        >
                          {session.user.platformRole === "SYSTEM_ADMIN"
                            ? "Review deletion"
                            : "Delete"}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
