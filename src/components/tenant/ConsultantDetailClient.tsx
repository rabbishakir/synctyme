"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { toast } from "sonner";

interface ConsultantData {
  id: string;
  consultantCode: string;
  name: string;
  email: string;
  phone: string;
  payrollCompany: string;
  internalTimesheetRequired: boolean;
  status: string;
  notes: string | null;
}

interface EmploymentCycle {
  id: string;
  hireDate: string;
  deactivationDate: string | null;
  rehireReason: string | null;
  closedAt: string | null;
}

interface ProjectRow {
  id: string;
  clientName: string;
  status: string;
  startDate: string;
  endDate: string | null;
}

interface TimesheetRow {
  id: string;
  weekStart: string;
  status: string;
  projectId: string;
}

export default function ConsultantDetailClient({
  consultant,
  employmentCycles,
  projects,
  timesheets,
  tenantId,
  role,
  canActivate,
  canDeactivate,
  canRehire,
}: {
  consultant: ConsultantData;
  employmentCycles: EmploymentCycle[];
  projects: ProjectRow[];
  timesheets: TimesheetRow[];
  tenantId: string;
  role: string;
  canEdit: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  canRehire: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doAction(endpoint: string, body: Record<string, unknown> = {}) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tenant/${tenantId}/consultants/${consultant.id}/${endpoint}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Action failed"); return; }
      toast.success(`${endpoint} successful`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    DRAFT: "outline",
    SUBMITTED: "default",
    APPROVED: "default",
    REJECTED: "destructive",
    LOCKED: "secondary",
    ACTIVE: "default",
    INACTIVE: "secondary",
    COMPLETED: "secondary",
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Profile</h2>
          <Badge variant={consultant.status === "ACTIVE" ? "default" : "secondary"}>
            {consultant.status}
          </Badge>
        </div>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { label: "Code", value: consultant.consultantCode, mono: true },
            { label: "Name", value: consultant.name },
            { label: "Email", value: consultant.email },
            { label: "Phone", value: consultant.phone },
            { label: "Payroll Company", value: consultant.payrollCompany },
            { label: "Internal Timesheet", value: consultant.internalTimesheetRequired ? "Required" : "Not required" },
          ].map((item) => (
            <div key={item.label}>
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{item.label}</dt>
              <dd className={`mt-1 text-sm text-foreground ${item.mono ? "font-mono" : ""}`}>{item.value}</dd>
            </div>
          ))}
          {consultant.notes && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{consultant.notes}</dd>
            </div>
          )}
        </dl>

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          {canActivate && consultant.status === "INACTIVE" && (
            <Button size="sm" disabled={loading} onClick={() => doAction("activate")}>Activate</Button>
          )}
          {canDeactivate && consultant.status === "ACTIVE" && (
            <Button size="sm" variant="outline" disabled={loading} onClick={() => {
              const date = prompt("Deactivation date (YYYY-MM-DD):");
              if (date) doAction("deactivate", { deactivationDate: date });
            }}>Deactivate</Button>
          )}
          {canRehire && consultant.status === "INACTIVE" && (
            <Button size="sm" variant="outline" disabled={loading} onClick={() => {
              const reason = prompt("Rehire reason:");
              if (reason) doAction("rehire", { rehireReason: reason });
            }}>Rehire</Button>
          )}
        </div>
      </div>

      {/* Employment History */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Employment History</h2>
        {employmentCycles.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No employment cycles.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {employmentCycles.map((ec) => (
              <div key={ec.id} className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                <p><span className="text-muted-foreground">Hired:</span> <span className="text-foreground">{new Date(ec.hireDate).toLocaleDateString()}</span></p>
                {ec.deactivationDate && (
                  <p><span className="text-muted-foreground">Deactivated:</span> <span className="text-foreground">{new Date(ec.deactivationDate).toLocaleDateString()}</span></p>
                )}
                {ec.rehireReason && (
                  <p><span className="text-muted-foreground">Rehire reason:</span> <span className="text-foreground">{ec.rehireReason}</span></p>
                )}
                {ec.closedAt && (
                  <p className="text-xs text-muted-foreground">Closed: {new Date(ec.closedAt).toLocaleDateString()}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projects */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Projects</h2>
          {["COMPANY_ADMIN", "HR"].includes(role) && (
            <Link href={`/tenant/${tenantId}/projects/new?consultantId=${consultant.id}`} className="text-sm text-primary hover:underline font-medium">
              Add project
            </Link>
          )}
        </div>
        {projects.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No projects.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Client</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Start</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">End</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2">
                      <Link href={`/tenant/${tenantId}/projects/${p.id}`} className="text-primary hover:underline font-medium">{p.clientName}</Link>
                    </td>
                    <td className="px-3 py-2"><Badge variant={STATUS_VARIANT[p.status] ?? "outline"}>{p.status}</Badge></td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{new Date(p.startDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{p.endDate ? new Date(p.endDate).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Timesheets */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Recent Timesheets</h2>
        {timesheets.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No timesheets.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Week</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {timesheets.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 text-foreground">{new Date(t.weekStart).toLocaleDateString()}</td>
                    <td className="px-3 py-2"><Badge variant={STATUS_VARIANT[t.status] ?? "outline"}>{t.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
