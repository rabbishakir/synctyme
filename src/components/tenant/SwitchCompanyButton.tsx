"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { TenantRole } from "@prisma/client";

interface SwitchCompanyButtonProps {
  tenantId: string;
}

export default function SwitchCompanyButton({ tenantId }: SwitchCompanyButtonProps) {
  const { update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      type="button"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/auth/switch-tenant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tenantId }),
          });
          if (!res.ok) return;
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
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Switching…" : "Switch to this company"}
    </Button>
  );
}
