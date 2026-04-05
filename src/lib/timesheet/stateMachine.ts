import type { TimesheetStatus } from "@prisma/client";

const VALID_TRANSITIONS: Record<TimesheetStatus, TimesheetStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["APPROVED", "REJECTED"],
  APPROVED: ["LOCKED"],
  REJECTED: ["DRAFT"],
  LOCKED: ["DRAFT"],
};

export function canTransition(
  from: TimesheetStatus,
  to: TimesheetStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(
  from: TimesheetStatus,
  to: TimesheetStatus
): void {
  if (!canTransition(from, to)) {
    throw new TransitionError(from, to);
  }
}

export class TransitionError extends Error {
  constructor(from: TimesheetStatus, to: TimesheetStatus) {
    super(`Invalid transition: ${from} → ${to}`);
    this.name = "TransitionError";
  }
}
