"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";

interface TimesheetRow {
  id: string;
  weekStart: string;
  status: string;
  totalHours: number;
  consultantName: string;
  consultantCode: string;
  clientName: string;
}

interface ConsultantOption {
  id: string;
  name: string;
  consultantCode: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  SUBMITTED: "default",
  APPROVED: "default",
  REJECTED: "destructive",
  LOCKED: "secondary",
};

export default function TimesheetListClient({
  timesheets,
  consultants,
  tenantId,
  canCreate,
  showConsultantFilter,
}: {
  timesheets: TimesheetRow[];
  consultants: ConsultantOption[];
  tenantId: string;
  canCreate: boolean;
  showConsultantFilter: boolean;
}) {
  const [consultantFilter, setConsultantFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = timesheets.filter((t) => {
    const matchConsultant =
      consultantFilter === "ALL" || t.consultantCode === consultantFilter;
    const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchConsultant && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {showConsultantFilter && (
          <select
            value={consultantFilter}
            onChange={(e) => setConsultantFilter(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="ALL">All consultants</option>
            {consultants.map((c) => (
              <option key={c.id} value={c.consultantCode}>
                {c.consultantCode} — {c.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="ALL">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="LOCKED">Locked</option>
        </select>
        {canCreate && (
          <Link href={`/tenant/${tenantId}/timesheets/new`} className="ml-auto">
            <Button size="sm">
              <Plus size={16} data-icon="inline-start" />
              New Timesheet
            </Button>
          </Link>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
            <Calendar size={24} />
          </div>
          <p className="text-sm font-medium text-foreground">No timesheets found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {canCreate ? "Create your first timesheet to get started." : "No timesheets match your filters."}
          </p>
          {canCreate && (
            <Link href={`/tenant/${tenantId}/timesheets/new`} className="mt-4">
              <Button size="sm" variant="outline">Create Timesheet</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Week</th>
                {showConsultantFilter && (
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Consultant</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Hours</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t) => {
                const start = new Date(t.weekStart);
                const end = new Date(start);
                end.setUTCDate(start.getUTCDate() + 6);
                const fmt = (d: Date) =>
                  d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
                return (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {fmt(start)} – {fmt(end)}
                    </td>
                    {showConsultantFilter && (
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {t.consultantCode} — {t.consultantName}
                      </td>
                    )}
                    <td className="px-4 py-3 text-muted-foreground">{t.clientName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[t.status] ?? "outline"}>{t.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">{t.totalHours.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/tenant/${tenantId}/timesheets/${t.id}`}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
