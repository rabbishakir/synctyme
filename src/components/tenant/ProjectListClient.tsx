"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface ProjectRow {
  id: string;
  clientName: string;
  consultantName: string;
  consultantCode: string;
  status: string;
  startDate: string;
  endDate: string | null;
}

interface ConsultantOption {
  id: string;
  name: string;
  consultantCode: string;
}

export default function ProjectListClient({
  projects,
  consultants,
  tenantId,
}: {
  projects: ProjectRow[];
  consultants: ConsultantOption[];
  tenantId: string;
}) {
  const [consultantFilter, setConsultantFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filtered = projects.filter((p) => {
    const matchesConsultant =
      consultantFilter === "ALL" ||
      p.consultantCode === consultantFilter;
    const matchesStatus =
      statusFilter === "ALL" || p.status === statusFilter;
    return matchesConsultant && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No projects found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Client
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Consultant
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Start
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  End
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/tenant/${tenantId}/projects/${p.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {p.clientName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {p.consultantCode} — {p.consultantName}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={p.status === "ACTIVE" ? "default" : "secondary"}
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(p.startDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.endDate
                      ? new Date(p.endDate).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
