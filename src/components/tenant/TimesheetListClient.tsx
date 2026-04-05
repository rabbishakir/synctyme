"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

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
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
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
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="ALL">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="LOCKED">Locked</option>
        </select>
        {canCreate && (
          <Link
            href={`/tenant/${tenantId}/timesheets/new`}
            className="ml-auto rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            New Timesheet
          </Link>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No timesheets found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Week
                </th>
                {showConsultantFilter && (
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Consultant
                  </th>
                )}
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Project
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Hours
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t) => {
                const start = new Date(t.weekStart);
                const end = new Date(start);
                end.setUTCDate(start.getUTCDate() + 6);
                const fmt = (d: Date) =>
                  d.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  });
                return (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-700">
                      {fmt(start)} – {fmt(end)}
                    </td>
                    {showConsultantFilter && (
                      <td className="px-4 py-3 text-gray-700">
                        {t.consultantCode} — {t.consultantName}
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-700">
                      {t.clientName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[t.status] ?? "outline"}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      {t.totalHours.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/tenant/${tenantId}/timesheets/${t.id}`}
                        className="text-sm text-blue-600 hover:underline"
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
