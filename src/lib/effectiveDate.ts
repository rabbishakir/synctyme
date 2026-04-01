import { prisma } from "@/lib/db";
import type { Decimal } from "@prisma/client/runtime/library";

export interface EffectiveRate {
  payRate: Decimal;
  incentiveRate: Decimal | null;
  effectiveDate: Date;
}

/**
 * Returns the rate that was active for a project on a given date.
 * Finds the most recent RateHistory row whose effectiveDate <= targetDate.
 */
export async function getRateForDate(
  projectId: string,
  targetDate: Date
): Promise<EffectiveRate> {
  const rate = await prisma.rateHistory.findFirst({
    where: {
      projectId,
      effectiveDate: { lte: targetDate },
    },
    orderBy: { effectiveDate: "desc" },
    select: {
      payRate: true,
      incentiveRate: true,
      effectiveDate: true,
    },
  });

  if (!rate) {
    throw new Error(
      `No rate found for project ${projectId} on or before ${targetDate.toISOString()}`
    );
  }

  return rate;
}
