"use client";

import type { ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { getFieldAccess, resolveRoleForFlac } from "@/lib/flac";
import { useSession } from "next-auth/react";

export interface FLACInputProps {
  fieldName: string;
  entity: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * Renders a controlled input when access is EDIT, plain text when VIEW, nothing when NO_ACCESS.
 */
export default function FLACInput({
  fieldName,
  entity,
  value,
  onChange,
  type = "text",
  className,
  "aria-label": ariaLabel,
}: FLACInputProps) {
  const { data: session, status } = useSession();

  if (status === "loading" || !session?.user) {
    return null;
  }

  const role = resolveRoleForFlac(session.user);
  const access = getFieldAccess(role, entity, fieldName);

  if (access === "NO_ACCESS") {
    return null;
  }

  if (access === "VIEW") {
    return (
      <span className={className} data-field={fieldName}>
        {value || "—"}
      </span>
    );
  }

  return (
    <Input
      type={type}
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) =>
        onChange(e.target.value)
      }
      className={className}
      aria-label={ariaLabel}
    />
  );
}
