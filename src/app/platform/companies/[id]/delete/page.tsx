import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import LogoutButton from "@/components/auth/LogoutButton";
import CompanyDeleteClient from "@/components/platform/CompanyDeleteClient";

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
  if (
    role === "SYSTEM_ADMIN" &&
    deletionRequest?.status === "PENDING"
  ) {
    mode = "review";
  }
  if (role === "SUPER_ADMIN" && deletionRequest?.status === "PENDING") {
    mode = "view";
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/platform/companies"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Companies
          </Link>
          <LogoutButton />
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Company deletion</h1>
        <p className="mt-1 text-sm text-gray-500">
          {session.user.email} · {role.replace(/_/g, " ")}
        </p>

        <div className="mt-8">
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
      </div>
    </main>
  );
}
