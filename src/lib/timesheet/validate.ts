import { prisma } from "@/lib/db";
import { getRateForDate } from "@/lib/effectiveDate";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export async function validateEntry(
  consultantId: string,
  projectId: string,
  date: Date,
  hours: number
): Promise<ValidationResult> {
  const errors: string[] = [];

  if (hours < 0 || hours > 24) {
    errors.push(`Hours must be between 0 and 24 (got ${hours})`);
  }

  const consultant = await prisma.consultant.findUnique({
    where: { id: consultantId },
    include: {
      employmentCycles: {
        orderBy: { hireDate: "desc" },
        take: 1,
      },
    },
  });

  if (!consultant) {
    errors.push("Consultant not found");
    return { valid: false, errors };
  }

  const cycle = consultant.employmentCycles[0];
  if (!cycle) {
    errors.push("Consultant has no employment cycle");
    return { valid: false, errors };
  }

  if (date < cycle.hireDate) {
    errors.push(
      `Date ${date.toISOString().slice(0, 10)} is before hire date ${cycle.hireDate.toISOString().slice(0, 10)}`
    );
  }

  if (cycle.deactivationDate && date > cycle.deactivationDate) {
    errors.push(
      `Date ${date.toISOString().slice(0, 10)} is after deactivation date ${cycle.deactivationDate.toISOString().slice(0, 10)}`
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    errors.push("Project not found");
    return { valid: false, errors };
  }

  if (date < project.startDate) {
    errors.push(
      `Date ${date.toISOString().slice(0, 10)} is before project start date ${project.startDate.toISOString().slice(0, 10)}`
    );
  }

  if (project.endDate && date > project.endDate) {
    errors.push(
      `Date ${date.toISOString().slice(0, 10)} is after project end date ${project.endDate.toISOString().slice(0, 10)}`
    );
  }

  try {
    await getRateForDate(projectId, date);
  } catch {
    errors.push(`No pay rate defined for project on ${date.toISOString().slice(0, 10)}`);
  }

  return { valid: errors.length === 0, errors };
}

export interface WeekEntry {
  date: Date;
  hours: number;
}

export async function validateWeek(
  consultantId: string,
  projectId: string,
  weekStart: Date,
  entries: WeekEntry[]
): Promise<ValidationResult> {
  const errors: string[] = [];

  if (weekStart.getUTCDay() !== 0) {
    errors.push("weekStart must be a Sunday");
  }

  for (const entry of entries) {
    const result = await validateEntry(
      consultantId,
      projectId,
      entry.date,
      entry.hours
    );
    if (!result.valid) {
      errors.push(...result.errors);
    }
  }

  return { valid: errors.length === 0, errors };
}
