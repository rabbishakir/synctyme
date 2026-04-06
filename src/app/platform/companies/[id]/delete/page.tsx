import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import CompanyDeleteClient from "@/components/platform/CompanyDeleteClient";
import PageHeader from "@/components/layout/PageHeader";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDeletePage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.platformRole) redirect("/login");

  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) notFound();

  const deletionRequest = await prisma.deletionRequest.findUnique({
    where: { companyId: id },
  });

  const role = session.user.platformRole;

  let mode: "initiate" | "review" | "view" = "view";
  if (role === "SUPER_ADMIN" && (!deletionRequest || deletionRequest.status !== "PENDING")) {
    mode = "initiate";
  }
  if (role === "SYSTEM_ADMIN" && deletionRequest?.status === "PENDING") {
    mode = "review";
  }
  if (role === "SUPER_ADMIN" && deletionRequest?.status === "PENDING") {
    mode = "view";
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Company Deletion"
        description={`${company.name} · ${role.replace(/_/g, " ")}`}
        breadcrumbs={[
          { label: "Platform", href: "/platform/companies" },
          { label: "Companies", href: "/platform/companies" },
          { label: "Delete" },
        ]}
      />

      <CompanyDeleteClient
        companyId={company.id}
        companyName={company.name}
        mode={mode}
        deletionRequest={
          deletionRequest
            ? {
                id: deletionRequest.id,
                status: deletionRequest.status,
                reason: deletionRequest.reason,
              }
            : null
        }
      />
    </div>
  );
}
