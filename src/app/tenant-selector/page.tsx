import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import SwitchCompanyButton from "@/components/tenant/SwitchCompanyButton";

export default async function TenantSelectorPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.platformRole) {
    redirect("/platform/companies");
  }

  const rows = await prisma.tenantMember.findMany({
    where: { userId: session.user.id },
    include: { company: { select: { id: true, name: true, status: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your companies</h1>
            <p className="mt-1 text-sm text-gray-500">{session.user.email}</p>
          </div>
          <LogoutButton />
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-gray-600">
            You are not a member of any company yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">{r.company.name}</p>
                  <p className="text-xs text-gray-500">
                    {r.role.replace(/_/g, " ")} · {r.company.status.replace(/_/g, " ")}
                  </p>
                </div>
                <SwitchCompanyButton tenantId={r.company.id} />
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/" className="text-blue-600 hover:underline">
            Go to home
          </Link>
        </p>
      </div>
    </main>
  );
}
