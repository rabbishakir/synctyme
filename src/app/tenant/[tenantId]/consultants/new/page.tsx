import { requireTenantAccess } from "@/lib/auth/tenant-guard";
import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import NewConsultantForm from "@/components/tenant/NewConsultantForm";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function NewConsultantPage({ params }: PageProps) {
  const { tenantId } = await params;
  await requireTenantAccess(tenantId, ["COMPANY_ADMIN", "HR"]);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/tenant/${tenantId}/consultants`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Consultants
          </Link>
          <LogoutButton />
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Add Consultant</h1>
        <p className="mt-1 text-sm text-gray-500">
          A consultant code will be generated automatically.
        </p>

        <div className="mt-6">
          <NewConsultantForm tenantId={tenantId} />
        </div>
      </div>
    </main>
  );
}
