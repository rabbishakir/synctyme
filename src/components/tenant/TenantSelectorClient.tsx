"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Loader2, CheckCircle2 } from "lucide-react";
import type { TenantRole } from "@prisma/client";

interface CompanyRow {
  id: string;
  role: string;
  company: {
    id: string;
    name: string;
    status: string;
  };
}

interface TenantSelectorClientProps {
  companies: CompanyRow[];
}

const ROLE_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  COMPANY_ADMIN: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", dot: "bg-blue-500", label: "Admin" },
  HR: { bg: "bg-purple-50 border-purple-200", text: "text-purple-700", dot: "bg-purple-500", label: "HR" },
  ACCOUNTS: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", label: "Accounts" },
  CONSULTANT: { bg: "bg-orange-50 border-orange-200", text: "text-orange-700", dot: "bg-orange-500", label: "Consultant" },
};

const STATUS_DOT: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  SUSPENDED: "bg-amber-500",
  PENDING_DELETION: "bg-orange-500",
  ARCHIVED: "bg-gray-400",
};

export default function TenantSelectorClient({ companies }: TenantSelectorClientProps) {
  const { update } = useSession();
  const router = useRouter();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const handleSwitch = async (tenantId: string) => {
    setSwitchingId(tenantId);
    try {
      const res = await fetch("/api/auth/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (!res.ok) {
        setSwitchingId(null);
        return;
      }
      const data = (await res.json()) as {
        tenantId: string;
        role: TenantRole;
      };
      await update({
        user: {
          activeTenantId: data.tenantId,
          role: data.role,
        },
      });
      router.push(`/tenant/${data.tenantId}/dashboard`);
      router.refresh();
    } catch {
      setSwitchingId(null);
    }
  };

  return (
    <div className="space-y-2">
      {companies.map((r) => {
        const role = ROLE_STYLE[r.role] ?? ROLE_STYLE.CONSULTANT;
        const isSwitching = switchingId === r.company.id;
        const isDisabled = switchingId !== null;
        const statusDot = STATUS_DOT[r.company.status] ?? "bg-gray-400";

        return (
          <button
            key={r.id}
            type="button"
            disabled={isDisabled}
            onClick={() => handleSwitch(r.company.id)}
            className="group flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md hover:border-primary/40 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {/* Company avatar */}
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-base font-bold transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              {r.company.name.charAt(0)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground truncate">{r.company.name}</p>
                <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${statusDot}`} title={r.company.status} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-medium leading-4 ${role.bg} ${role.text}`}
                >
                  {role.label}
                </span>
              </div>
            </div>

            {/* Arrow / Loading */}
            <div className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
              {isSwitching ? (
                <Loader2 size={18} className="animate-spin text-primary" />
              ) : (
                <ArrowRight size={18} />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
