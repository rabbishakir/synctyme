import CompanyCreateForm from "@/components/platform/CompanyCreateForm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NewCompanyPage() {
  const session = await auth();
  if (!session?.user?.platformRole) redirect("/login");

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create Company</h1>
          <p className="mt-1 text-sm text-gray-500">
            Provision a new tenant with a Company Admin account.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <CompanyCreateForm />
        </div>
      </div>
    </main>
  );
}
