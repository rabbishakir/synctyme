import CompanyCreateForm from "@/components/platform/CompanyCreateForm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";

export default async function NewCompanyPage() {
  const session = await auth();
  if (!session?.user?.platformRole) redirect("/login");

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Create New Company"
        description="Provision a new tenant with a Company Admin account."
        breadcrumbs={[
          { label: "Platform", href: "/platform/companies" },
          { label: "Companies", href: "/platform/companies" },
          { label: "New" },
        ]}
      />
      <CompanyCreateForm />
    </div>
  );
}
