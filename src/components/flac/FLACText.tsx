"use client";

import { getFieldAccess, resolveRoleForFlac } from "@/lib/flac";
import { useSession } from "next-auth/react";

export interface FLACTextProps {
  fieldName: string;
  entity: string;
  value: string | null | undefined;
  className?: string;
}

/** Read-only field display; masks value when NO_ACCESS. */
export default function FLACText({
  fieldName,
  entity,
  value,
  className,
}: FLACTextProps) {
  const { data: session, status } = useSession();

  if (status === "loading" || !session?.user) {
    return null;
  }

  const role = resolveRoleForFlac(session.user);
  const access = getFieldAccess(role, entity, fieldName);

  if (access === "NO_ACCESS") {
    return <span className={className}>—</span>;
  }

  const display =
    value !== null && value !== undefined && String(value).length > 0
      ? String(value)
      : "—";

  return (
    <span className={className} data-field={fieldName}>
      {display}
    </span>
  );
}
