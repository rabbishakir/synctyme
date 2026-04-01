"use client";

import { useSession } from "next-auth/react";
import type { FieldAccessLevel } from "@/lib/flac";
import { getFieldAccessMap } from "@/lib/flac";

/**
 * Reads the current tenant role from NextAuth (`session.user.role`) and returns
 * a map of field names to FLAC levels for the given entity.
 */
export function useFieldAccess(
  entity: string
): Record<string, FieldAccessLevel> {
  const { data: session, status } = useSession();

  if (status === "loading" || !session?.user) {
    return {};
  }

  const role =
    session.user.role ??
    (session.user.platformRole === "SUPER_ADMIN"
      ? "SUPER_ADMIN"
      : session.user.platformRole === "SYSTEM_ADMIN"
        ? "SYSTEM_ADMIN"
        : "CONSULTANT");

  return getFieldAccessMap(role, entity);
}
