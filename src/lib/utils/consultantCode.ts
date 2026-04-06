import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const CODE_PREFIX = "CST-";
const CODE_REGEX = /^CST-\d{4}$/;

/**
 * Generates the next sequential consultant code for a company.
 * Format: CST-0001, CST-0002, etc.
 */
export async function generateConsultantCode(
  _companyId: string
): Promise<string> {
  const latest = await prisma.consultant.findFirst({
    where: { consultantCode: { startsWith: CODE_PREFIX } },
    orderBy: { consultantCode: "desc" },
    select: { consultantCode: true },
  });

  let next = 1;
  if (latest?.consultantCode) {
    const numeric = latest.consultantCode.replace(CODE_PREFIX, "");
    const parsed = parseInt(numeric, 10);
    if (!isNaN(parsed)) {
      next = parsed + 1;
    }
  }

  return `${CODE_PREFIX}${String(next).padStart(4, "0")}`;
}

/**
 * Updates a consultant's code after validating format and uniqueness.
 */
export async function updateConsultantCode(
  consultantId: string,
  newCode: string,
  userId: string,
  companyId: string,
  userRole: string
): Promise<void> {
  if (!CODE_REGEX.test(newCode)) {
    throw new Error("Invalid consultant code format. Expected CST-XXXX.");
  }

  const existing = await prisma.consultant.findFirst({
    where: { consultantCode: newCode, id: { not: consultantId } },
  });
  if (existing) {
    throw new Error(`Consultant code ${newCode} is already in use.`);
  }

  const consultant = await prisma.consultant.findUnique({
    where: { id: consultantId },
    select: { consultantCode: true },
  });
  if (!consultant) {
    throw new Error("Consultant not found.");
  }

  const oldCode = consultant.consultantCode;

  await prisma.consultant.update({
    where: { id: consultantId },
    data: { consultantCode: newCode },
  });

  await writeAuditLog({
    companyId,
    userId,
    role: userRole,
    entity: "Consultant",
    entityId: consultantId,
    field: "consultantCode",
    oldValue: oldCode,
    newValue: newCode,
    action: "CONSULTANT_CODE_UPDATED",
  });
}
