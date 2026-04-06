import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";
import TenantSelectorClient from "@/components/tenant/TenantSelectorClient";

export default async function TenantSelectorPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.platformRole) {
    redirect("/platform/companies");
  }

  const rows = await prisma.tenantMember.findMany({
    where: { userId: session.user.id },
    include: {
      company: {
        select: { id: true, name: true, status: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const serialized = rows.map((r) => ({
    id: r.id,
    role: r.role as string,
    company: {
      id: r.company.id,
      name: r.company.name,
      status: r.company.status as string,
    },
  }));

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left decorative panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-[420px] flex-col justify-between bg-gradient-to-br from-primary via-primary to-primary/80 p-10 text-primary-foreground">
        <div>
          <div className="flex items-center gap-2.5 mb-16">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-sm font-bold backdrop-blur-sm">
              S
            </div>
            <span className="text-lg font-semibold tracking-tight">SyncTyme</span>
          </div>
          <h2 className="text-3xl font-bold leading-tight">
            Manage your timesheets with confidence.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-primary-foreground/70">
            Track hours, manage consultants, and streamline approvals — all in one place.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/50">
          Multi-tenant timesheet management
        </p>
      </div>

      {/* Right content area */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-10">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
              S
            </div>
            <span className="text-sm font-semibold text-foreground">SyncTyme</span>
          </div>
          <div className="hidden lg:block">
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{session.user.email}</span>
            </p>
          </div>
          <LogoutButton />
        </div>

        {/* Main content */}
        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md animate-fade-in">
            {/* Mobile user info */}
            <p className="text-xs text-muted-foreground mb-6 lg:hidden">
              Signed in as <span className="font-medium text-foreground">{session.user.email}</span>
            </p>

            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Select a company
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Choose which company you&apos;d like to work in.
              </p>
            </div>

            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                  <Building2 size={28} />
                </div>
                <p className="text-sm font-semibold text-foreground">No companies available</p>
                <p className="mt-1.5 text-xs text-muted-foreground max-w-[260px]">
                  You are not a member of any company yet. Contact your administrator for access.
                </p>
              </div>
            ) : (
              <TenantSelectorClient companies={serialized} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
