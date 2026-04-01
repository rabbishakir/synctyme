"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface TenantOption {
  companyId: string;
  name: string;
  role: string;
}

interface TenantSwitcherProps {
  currentTenantId: string;
}

export default function TenantSwitcher({
  currentTenantId,
}: TenantSwitcherProps) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.platformRole) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/my-tenants");
      if (!res.ok || cancelled) {
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { tenants: TenantOption[] };
      setTenants(data.tenants ?? []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.platformRole]);

  if (status === "loading" || loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">
        Loading companies…
      </div>
    );
  }

  if (session?.user?.platformRole) {
    return null;
  }

  const current = tenants.find((t) => t.companyId === currentTenantId);
  const label = current
    ? `${current.name} · ${current.role.replace(/_/g, " ")}`
    : "Select company";

  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
        Company
      </span>
      <select
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm"
        value={currentTenantId}
        onChange={async (e) => {
          const nextId = e.target.value;
          const res = await fetch("/api/auth/switch-tenant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tenantId: nextId }),
          });
          if (!res.ok) return;
          const data = (await res.json()) as {
            tenantId: string;
            role: string;
          };
          await update({
            user: {
              activeTenantId: data.tenantId,
              role: data.role,
            },
          });
          router.push(`/tenant/${data.tenantId}/dashboard`);
          router.refresh();
        }}
      >
        {tenants.map((t) => (
          <option key={t.companyId} value={t.companyId}>
            {t.name} · {t.role.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs text-gray-400">{label}</span>
    </label>
  );
}
