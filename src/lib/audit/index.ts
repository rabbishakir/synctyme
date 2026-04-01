import { prisma } from "@/lib/db";

interface AuditLogParams {
  companyId?: string;
  userId: string;
  role: string;
  entity: string;
  entityId: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  action: string;
  ipAddress?: string;
}

interface PlatformAuditLogParams {
  action: string;
  performedBy: string;
  targetId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  ipAddress?: string;
}

export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        role: params.role,
        entity: params.entity,
        entityId: params.entityId,
        field: params.field,
        oldValue: params.oldValue,
        newValue: params.newValue,
        action: params.action,
        ipAddress: params.ipAddress,
      },
    });
  } catch {
    // Silent failure — audit logs must never break the main flow
  }
}

export async function writePlatformAuditLog(
  params: PlatformAuditLogParams
): Promise<void> {
  try {
    await prisma.platformAuditLog.create({
      data: {
        action: params.action,
        performedBy: params.performedBy,
        targetId: params.targetId,
        metadata: params.metadata,
        ipAddress: params.ipAddress,
      },
    });
  } catch {
    // Silent failure — audit logs must never break the main flow
  }
}
