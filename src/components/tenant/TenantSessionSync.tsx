"use client";

import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Keeps `session.user.activeTenantId` and `session.user.role` aligned with the URL tenant.
 */
export default function TenantSessionSync() {
  const { data: session, status, update } = useSession();
  const params = useParams();
  const tenantId = typeof params?.tenantId === "string" ? params.tenantId : null;
  const lastSynced = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !tenantId || !session?.user?.id) return;
    if (session.user.platformRole) return;

    const needsSync =
      session.user.activeTenantId !== tenantId ||
      session.user.role == null;

    if (!needsSync) {
      lastSynced.current = tenantId;
      return;
    }

    if (lastSynced.current === tenantId && session.user.role != null) {
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (!res.ok || cancelled) return;
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
      lastSynced.current = data.tenantId;
    })();

    return () => {
      cancelled = true;
    };
  }, [status, tenantId, session?.user?.id, session?.user?.activeTenantId, session?.user?.role, session?.user?.platformRole, update]);

  return null;
}
