export type FieldAccessLevel = "EDIT" | "VIEW" | "NO_ACCESS";

/**
 * Role used for FLAC checks. Platform admins keep platform scope even when a
 * tenant role is active (e.g. after switching company in the session).
 */
export function resolveRoleForFlac(session: {
  role?: string | null;
  platformRole?: string | null;
}): string {
  const platform = session.platformRole;
  if (platform === "SUPER_ADMIN" || platform === "SYSTEM_ADMIN") {
    return platform;
  }
  if (session.role) return session.role;
  return "CONSULTANT";
}

type RoleKey =
  | "SUPER_ADMIN"
  | "SYSTEM_ADMIN"
  | "COMPANY_ADMIN"
  | "HR"
  | "ACCOUNTS"
  | "CONSULTANT";

/** Maps matrix tokens to API levels (OVERRIDE/UPLOAD → EDIT). */
function normalize(level: FieldAccessLevel | "OVERRIDE" | "UPLOAD"): FieldAccessLevel {
  if (level === "OVERRIDE" || level === "UPLOAD") return "EDIT";
  return level;
}

/**
 * Returns field-level access for a role, entity, and field per SyncTyme FLAC matrix.
 */
export function getFieldAccess(
  role: string,
  entity: string,
  field: string
): FieldAccessLevel {
  const r = role as RoleKey;
  const e = entity;
  const f = field;

  if (r === "SUPER_ADMIN") {
    return "EDIT";
  }
  if (r === "SYSTEM_ADMIN") {
    return "VIEW";
  }

  // Tenant user invite (settings UI)
  if (e === "TenantUserInvite" || e === "USER_INVITE") {
    if (f === "name" || f === "email" || f === "role") {
      if (r === "COMPANY_ADMIN") return "EDIT";
      return "NO_ACCESS";
    }
  }

  // Consultant Profile
  if (e === "ConsultantProfile" || e === "CONSULTANT_PROFILE") {
    if (f === "consultantCode" || f === "name" || f === "email") {
      if (r === "HR" || r === "ACCOUNTS") return "EDIT";
      if (r === "CONSULTANT") return "VIEW";
      if (r === "COMPANY_ADMIN") return "VIEW";
      return "NO_ACCESS";
    }
    if (f === "payrollCompany") {
      return "VIEW";
    }
    if (f === "hireDate") {
      if (r === "HR") return "EDIT";
      if (r === "ACCOUNTS") return normalize("OVERRIDE");
      if (r === "CONSULTANT") return "VIEW";
      if (r === "COMPANY_ADMIN") return "VIEW";
      return "NO_ACCESS";
    }
    if (f === "status") {
      if (r === "COMPANY_ADMIN" || r === "ACCOUNTS") return "EDIT";
      if (r === "HR" || r === "CONSULTANT") return "VIEW";
      return "NO_ACCESS";
    }
    if (f === "internalTimesheetRequired") {
      if (r === "HR" || r === "ACCOUNTS") return "EDIT";
      if (r === "CONSULTANT" || r === "COMPANY_ADMIN") return "VIEW";
      return "NO_ACCESS";
    }
    if (f === "notes") {
      if (r === "HR") return "EDIT";
      if (r === "ACCOUNTS") return "VIEW";
      if (r === "CONSULTANT" || r === "COMPANY_ADMIN") return "VIEW";
      return "NO_ACCESS";
    }
  }

  // Project
  if (e === "Project" || e === "PROJECT") {
    if (f === "clientName") {
      if (r === "HR" || r === "ACCOUNTS") return "EDIT";
      if (r === "CONSULTANT") return "VIEW";
      if (r === "COMPANY_ADMIN") return "VIEW";
      return "NO_ACCESS";
    }
    if (f === "payRate") {
      if (r === "ACCOUNTS") return "EDIT";
      if (r === "HR" || r === "CONSULTANT" || r === "COMPANY_ADMIN") return "VIEW";
      return "NO_ACCESS";
    }
    if (f === "incentiveRate") {
      if (r === "ACCOUNTS") return "EDIT";
      if (r === "HR") return "VIEW";
      if (r === "CONSULTANT") return "NO_ACCESS";
      if (r === "COMPANY_ADMIN") return "VIEW";
      return "NO_ACCESS";
    }
    if (f === "startDate") {
      if (r === "HR") return "EDIT";
      if (r === "ACCOUNTS") return "VIEW";
      if (r === "CONSULTANT" || r === "COMPANY_ADMIN") return "VIEW";
      return "NO_ACCESS";
    }
    if (f === "recruiter") {
      if (r === "HR") return "EDIT";
      if (r === "ACCOUNTS") return "VIEW";
      if (r === "CONSULTANT" || r === "COMPANY_ADMIN") return "VIEW";
      return "NO_ACCESS";
    }
  }

  // Timesheet
  if (e === "Timesheet" || e === "TIMESHEET") {
    if (f === "enteredHours") {
      if (r === "CONSULTANT" || r === "ACCOUNTS") return "EDIT";
      if (r === "HR" || r === "COMPANY_ADMIN") return "VIEW";
      return "NO_ACCESS";
    }
    if (f === "uploadedFile") {
      if (r === "CONSULTANT") return normalize("UPLOAD");
      return "VIEW";
    }
    if (f === "status") {
      if (r === "ACCOUNTS") return "EDIT";
      if (r === "HR" || r === "CONSULTANT" || r === "COMPANY_ADMIN") return "VIEW";
      return "NO_ACCESS";
    }
    if (f === "reopenLocked") {
      if (r === "ACCOUNTS") return "EDIT";
      return "VIEW";
    }
  }

  return "NO_ACCESS";
}

const ENTITY_FIELDS: Record<string, string[]> = {
  ConsultantProfile: [
    "consultantCode",
    "name",
    "email",
    "payrollCompany",
    "hireDate",
    "status",
    "internalTimesheetRequired",
    "notes",
  ],
  CONSULTANT_PROFILE: [
    "consultantCode",
    "name",
    "email",
    "payrollCompany",
    "hireDate",
    "status",
    "internalTimesheetRequired",
    "notes",
  ],
  Project: [
    "clientName",
    "payRate",
    "incentiveRate",
    "startDate",
    "recruiter",
  ],
  PROJECT: [
    "clientName",
    "payRate",
    "incentiveRate",
    "startDate",
    "recruiter",
  ],
  Timesheet: ["enteredHours", "uploadedFile", "status", "reopenLocked"],
  TIMESHEET: ["enteredHours", "uploadedFile", "status", "reopenLocked"],
  TenantUserInvite: ["name", "email", "role"],
  USER_INVITE: ["name", "email", "role"],
  CompanyDeletion: ["reason"],
  DELETION_REQUEST: ["reason"],
};

export function getFieldAccessMap(
  role: string,
  entity: string
): Record<string, FieldAccessLevel> {
  const fields = ENTITY_FIELDS[entity] ?? [];
  const out: Record<string, FieldAccessLevel> = {};
  for (const field of fields) {
    out[field] = getFieldAccess(role, entity, field);
  }
  return out;
}
