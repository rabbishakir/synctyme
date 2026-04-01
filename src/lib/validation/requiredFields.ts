import { prisma } from "@/lib/db";
import type { CustomFieldEntity } from "@prisma/client";

const ENTITY_ALIASES: Record<string, CustomFieldEntity> = {
  CONSULTANT: "CONSULTANT",
  ConsultantProfile: "CONSULTANT",
  CONSULTANT_PROFILE: "CONSULTANT",
  PROJECT: "PROJECT",
  Project: "PROJECT",
  TIMESHEET: "TIMESHEET",
  Timesheet: "TIMESHEET",
};

/**
 * Returns custom field names that are required for an entity within a company.
 */
export async function getRequiredFields(
  entity: string,
  companyId: string
): Promise<string[]> {
  const entityEnum = ENTITY_ALIASES[entity];
  if (!entityEnum) {
    return [];
  }
  const rows = await prisma.customField.findMany({
    where: {
      companyId,
      entity: entityEnum,
      isRequired: true,
    },
    select: { fieldName: true },
    orderBy: { displayOrder: "asc" },
  });
  return rows.map((r) => r.fieldName);
}

export function validateRequired(
  data: Record<string, unknown>,
  requiredFields: string[]
): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  for (const key of requiredFields) {
    const v = data[key];
    if (v === undefined || v === null || v === "") {
      missingFields.push(key);
    }
  }
  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
