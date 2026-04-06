"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import WeeklyGrid, { type GridEntry } from "@/components/timesheet/WeeklyGrid";
import FileUpload from "@/components/timesheet/FileUpload";
import SubmitPreview from "@/components/timesheet/SubmitPreview";

interface TimesheetData {
  id: string;
  consultantId: string;
  projectId: string;
  companyId: string;
  weekStart: string;
  status: string;
  uploadedFileUrl: string | null;
  uploadedFileName: string | null;
  uploadedFileSize: number | null;
  uploadedFileMimeType: string | null;
  isCarryForward: boolean;
  originalTimesheetId: string | null;
  carryForwardDates: string[] | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  reopenedBy: string | null;
  reopenedAt: string | null;
  reopenReason: string | null;
  entries: Array<{ date: string; hours: number; notes: string | null }>;
  consultant: {
    id: string;
    name: string;
    consultantCode: string;
    userId: string;
    employmentCycles: Array<{
      hireDate: string;
      deactivationDate: string | null;
    }>;
  };
  project: {
    id: string;
    clientName: string;
    startDate: string;
    endDate: string | null;
    clientApprovedTimesheetRequired: boolean;
    rateHistory: Array<{ payRate: string; effectiveDate: string }>;
  };
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  SUBMITTED: "default",
  APPROVED: "default",
  REJECTED: "destructive",
  LOCKED: "secondary",
};

export default function TimesheetDetailClient({
  timesheet: initial,
  tenantId,
  userRole,
  isOwner,
}: {
  timesheet: TimesheetData;
  tenantId: string;
  userRole: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [timesheet, setTimesheet] = useState(initial);
  const [showSubmitPreview, setShowSubmitPreview] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [showReasonModal, setShowReasonModal] = useState<"reject" | "reopen" | null>(null);
  const [showCarryForward, setShowCarryForward] = useState(false);
  const [carryForwardDates, setCarryForwardDates] = useState<Set<string>>(new Set());

  const isDraft = timesheet.status === "DRAFT";
  const isRejected = timesheet.status === "REJECTED";
  const isSubmitted = timesheet.status === "SUBMITTED";
  const isLocked = timesheet.status === "LOCKED";
  const isApproved = timesheet.status === "APPROVED";
  const canEdit = isOwner && (isDraft || isRejected);
  const isAccounts = userRole === "ACCOUNTS";

  const disabledDates = computeDisabledDates(timesheet);
  const totalHours = timesheet.entries.reduce((s, e) => s + Number(e.hours), 0);
  const currentRate = timesheet.project.rateHistory[0]?.payRate ?? null;

  const handleSave = useCallback(
    async (entries: GridEntry[]) => {
      const res = await fetch(
        `/api/tenant/${tenantId}/timesheets/${timesheet.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setTimesheet((prev) => ({
          ...prev,
          entries: data.timesheet.entries.map((e: { date: string; hours: string | number; notes: string | null }) => ({
            date: e.date,
            hours: Number(e.hours),
            notes: e.notes,
          })),
          status: data.timesheet.status,
        }));
      }
    },
    [tenantId, timesheet.id]
  );

  async function performAction(
    action: string,
    body?: Record<string, unknown>
  ) {
    setActionError(null);
    setActionLoading(action);
    try {
      const res = await fetch(
        `/api/tenant/${tenantId}/timesheets/${timesheet.id}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? `${action} failed`);
        return;
      }
      router.refresh();
      setTimesheet((prev) => ({ ...prev, ...data.timesheet }));
      setShowSubmitPreview(false);
      setShowReasonModal(null);
      setReasonText("");
    } catch {
      setActionError("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Status + Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">{timesheet.project.clientName}</h2>
            <Badge variant={STATUS_VARIANT[timesheet.status] ?? "outline"}>{timesheet.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {timesheet.consultant.consultantCode} — {timesheet.consultant.name}
          </p>
          {timesheet.isCarryForward && (
            <p className="mt-1 text-xs text-amber-600 font-medium">Carry-forward from previous period</p>
          )}
        </div>
        {currentRate && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Pay Rate</p>
            <p className="text-lg font-bold tabular-nums text-foreground">${currentRate}/hr</p>
          </div>
        )}
      </div>

      {/* Rejection notice */}
      {isRejected && timesheet.rejectionReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm font-medium text-destructive">Rejected</p>
          <p className="mt-1 text-sm text-destructive/80">{timesheet.rejectionReason}</p>
        </div>
      )}

      {/* Pending approval notice */}
      {isSubmitted && !isAccounts && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="text-sm text-primary">This timesheet has been submitted and is pending approval.</p>
        </div>
      )}

      {/* Locked / Approved notice */}
      {(isLocked || isApproved) && (
        <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            This timesheet is <span className="font-semibold text-foreground">{isLocked ? "locked" : "approved"}</span>. No further edits are allowed.
          </p>
          {timesheet.reopenReason && (
            <p className="mt-1 text-xs text-muted-foreground">Last reopened: {timesheet.reopenReason}</p>
          )}
        </div>
      )}

      {/* Weekly Grid */}
      <WeeklyGrid
        timesheetId={timesheet.id}
        consultantId={timesheet.consultantId}
        projectId={timesheet.projectId}
        weekStart={timesheet.weekStart}
        entries={timesheet.entries.map((e) => ({
          date: e.date,
          hours: Number(e.hours),
        }))}
        onSave={handleSave}
        disabled={!canEdit}
        disabledDates={disabledDates}
      />

      {/* File Upload */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-2">
          Supporting Document
          {timesheet.project.clientApprovedTimesheetRequired && (
            <span className="ml-1 text-destructive">*</span>
          )}
        </h3>
        <FileUpload
          tenantId={tenantId}
          timesheetId={timesheet.id}
          currentFileName={timesheet.uploadedFileName}
          currentFileUrl={timesheet.uploadedFileUrl}
          currentFileSize={timesheet.uploadedFileSize}
          disabled={!canEdit}
          onUploadComplete={(data) =>
            setTimesheet((prev) => ({ ...prev, ...data }))
          }
        />
      </div>

      {/* Error */}
      {actionError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {/* Consultant: Submit */}
        {canEdit && (
          <Button
            onClick={() => setShowSubmitPreview(true)}
            disabled={!!actionLoading}
          >
            Submit
          </Button>
        )}

        {/* Accounts: Approve / Reject */}
        {isSubmitted && isAccounts && (
          <>
            <Button
              onClick={() => performAction("approve")}
              disabled={!!actionLoading}
            >
              {actionLoading === "approve" ? "Approving..." : "Approve"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowReasonModal("reject")}
              disabled={!!actionLoading}
            >
              Reject
            </Button>
          </>
        )}

        {/* Accounts: Reopen */}
        {(isLocked || isApproved) && isAccounts && (
          <Button
            variant="outline"
            onClick={() => setShowReasonModal("reopen")}
            disabled={!!actionLoading}
          >
            Reopen
          </Button>
        )}

        {/* Accounts: Carry Forward */}
        {isLocked && isAccounts && (
          <Button
            variant="secondary"
            onClick={() => {
              setCarryForwardDates(new Set());
              setShowCarryForward(true);
            }}
            disabled={!!actionLoading}
          >
            Carry Forward
          </Button>
        )}
      </div>

      {/* Submit Preview */}
      <SubmitPreview
        open={showSubmitPreview}
        onClose={() => setShowSubmitPreview(false)}
        onConfirm={() => performAction("submit")}
        loading={actionLoading === "submit"}
        weekStart={timesheet.weekStart}
        totalHours={totalHours}
        payRate={currentRate}
        clientName={timesheet.project.clientName}
        uploadedFileName={timesheet.uploadedFileName}
      />

      {/* Reason Modal (Reject / Reopen) */}
      {showReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl animate-fade-in">
            <h3 className="text-lg font-semibold text-foreground">
              {showReasonModal === "reject" ? "Reject Timesheet" : "Reopen Timesheet"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {showReasonModal === "reject"
                ? "Provide a reason for rejecting this timesheet."
                : "Provide a reason for reopening this locked timesheet."}
            </p>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 outline-none"
              placeholder="Reason..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReasonModal(null);
                  setReasonText("");
                }}
                disabled={!!actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant={showReasonModal === "reject" ? "destructive" : "default"}
                onClick={() => {
                  if (!reasonText.trim()) return;
                  const body =
                    showReasonModal === "reject"
                      ? { rejectionReason: reasonText }
                      : { reopenReason: reasonText };
                  performAction(showReasonModal, body);
                }}
                disabled={!reasonText.trim() || !!actionLoading}
              >
                {actionLoading
                  ? "Processing..."
                  : showReasonModal === "reject"
                    ? "Reject"
                    : "Reopen"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Carry Forward Modal */}
      {showCarryForward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl animate-fade-in">
            <h3 className="text-lg font-semibold text-foreground">Carry Forward</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Select dates to carry forward to the next pay period. A new DRAFT timesheet will be created.
            </p>

            <div className="mt-4 space-y-1.5">
              {getNextWeekDates(timesheet.weekStart).map((d) => {
                const key = d.toISOString().slice(0, 10);
                const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
                const checked = carryForwardDates.has(key);
                return (
                  <label key={key} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setCarryForwardDates((prev) => {
                          const next = new Set(prev);
                          if (next.has(key)) next.delete(key);
                          else next.add(key);
                          return next;
                        });
                      }}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <span className="text-foreground">{label}</span>
                  </label>
                );
              })}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCarryForward(false)}
                disabled={!!actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (carryForwardDates.size === 0) return;
                  setActionError(null);
                  setActionLoading("carry-forward");
                  try {
                    const res = await fetch(
                      `/api/tenant/${tenantId}/timesheets/${timesheet.id}/carry-forward`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          dates: Array.from(carryForwardDates),
                        }),
                      }
                    );
                    const data = await res.json();
                    if (!res.ok) {
                      setActionError(
                        data.error ?? "Carry-forward failed"
                      );
                      return;
                    }
                    setShowCarryForward(false);
                    router.push(
                      `/tenant/${tenantId}/timesheets/${data.timesheet.id}`
                    );
                  } catch {
                    setActionError("Something went wrong");
                  } finally {
                    setActionLoading(null);
                  }
                }}
                disabled={carryForwardDates.size === 0 || !!actionLoading}
              >
                {actionLoading === "carry-forward"
                  ? "Creating..."
                  : `Carry Forward (${carryForwardDates.size} day${carryForwardDates.size !== 1 ? "s" : ""})`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getNextWeekDates(weekStartStr: string): Date[] {
  const d = new Date(weekStartStr);
  d.setUTCDate(d.getUTCDate() + 7);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d);
    day.setUTCDate(d.getUTCDate() + i);
    return day;
  });
}

function computeDisabledDates(timesheet: TimesheetData): Set<string> {
  const disabled = new Set<string>();
  const weekStart = new Date(timesheet.weekStart);

  if (timesheet.isCarryForward && timesheet.carryForwardDates?.length) {
    const allowed = new Set(
      timesheet.carryForwardDates.map((d) => d.slice(0, 10))
    );
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setUTCDate(weekStart.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      if (!allowed.has(key)) disabled.add(key);
    }
    return disabled;
  }

  const cycle = timesheet.consultant.employmentCycles[0];
  const projectStart = new Date(timesheet.project.startDate);
  const projectEnd = timesheet.project.endDate
    ? new Date(timesheet.project.endDate)
    : null;
  const hireDate = cycle ? new Date(cycle.hireDate) : null;
  const deactivationDate = cycle?.deactivationDate
    ? new Date(cycle.deactivationDate)
    : null;

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);

    if (hireDate && d < hireDate) {
      disabled.add(key);
      continue;
    }
    if (deactivationDate && d > deactivationDate) {
      disabled.add(key);
      continue;
    }
    if (d < projectStart) {
      disabled.add(key);
      continue;
    }
    if (projectEnd && d > projectEnd) {
      disabled.add(key);
      continue;
    }
  }

  return disabled;
}
