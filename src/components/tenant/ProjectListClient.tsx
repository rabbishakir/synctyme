"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";

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
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
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
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
            <Briefcase size={24} />
          </div>
          <p className="text-sm font-medium text-foreground">No projects found</p>
          <p className="mt-1 text-xs text-muted-foreground">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Consultant</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">Start</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">End</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/tenant/${tenantId}/projects/${p.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {p.clientName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {p.consultantCode} — {p.consultantName}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={p.status === "ACTIVE" ? "default" : "secondary"}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {new Date(p.startDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {p.endDate ? new Date(p.endDate).toLocaleDateString() : "—"}
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
