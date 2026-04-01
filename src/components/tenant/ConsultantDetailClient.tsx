"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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

  async function doAction(
    endpoint: string,
    body: Record<string, unknown> = {}
  ) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tenant/${tenantId}/consultants/${consultant.id}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Action failed");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
          <Badge
            variant={consultant.status === "ACTIVE" ? "default" : "secondary"}
          >
            {consultant.status}
          </Badge>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500 uppercase">Code</dt>
            <dd className="mt-1 font-mono text-sm">{consultant.consultantCode}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase">Name</dt>
            <dd className="mt-1 text-sm">{consultant.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase">Email</dt>
            <dd className="mt-1 text-sm">{consultant.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase">Phone</dt>
            <dd className="mt-1 text-sm">{consultant.phone}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase">Payroll Company</dt>
            <dd className="mt-1 text-sm">{consultant.payrollCompany}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase">
              Internal Timesheet
            </dt>
            <dd className="mt-1 text-sm">
              {consultant.internalTimesheetRequired ? "Required" : "Not required"}
            </dd>
          </div>
          {consultant.notes && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-500 uppercase">Notes</dt>
              <dd className="mt-1 text-sm text-gray-700">{consultant.notes}</dd>
            </div>
          )}
        </dl>

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {canActivate && consultant.status === "INACTIVE" && (
            <Button
              size="sm"
              disabled={loading}
              onClick={() => doAction("activate")}
            >
              Activate
            </Button>
          )}
          {canDeactivate && consultant.status === "ACTIVE" && (
            <Button
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => {
                const date = prompt("Deactivation date (YYYY-MM-DD):");
                if (date) doAction("deactivate", { deactivationDate: date });
              }}
            >
              Deactivate
            </Button>
          )}
          {canRehire && consultant.status === "INACTIVE" && (
            <Button
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => {
                const reason = prompt("Rehire reason:");
                if (reason) doAction("rehire", { rehireReason: reason });
              }}
            >
              Rehire
            </Button>
          )}
        </div>
      </div>

      {/* Employment History */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Employment History
        </h2>
        {employmentCycles.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No employment cycles.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {employmentCycles.map((ec) => (
              <div
                key={ec.id}
                className="rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 text-sm"
              >
                <p>
                  <span className="text-gray-500">Hired:</span>{" "}
                  {new Date(ec.hireDate).toLocaleDateString()}
                </p>
                {ec.deactivationDate && (
                  <p>
                    <span className="text-gray-500">Deactivated:</span>{" "}
                    {new Date(ec.deactivationDate).toLocaleDateString()}
                  </p>
                )}
                {ec.rehireReason && (
                  <p>
                    <span className="text-gray-500">Rehire reason:</span>{" "}
                    {ec.rehireReason}
                  </p>
                )}
                {ec.closedAt && (
                  <p className="text-xs text-gray-400">
                    Closed: {new Date(ec.closedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projects */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
          {["COMPANY_ADMIN", "HR"].includes(role) && (
            <Link
              href={`/tenant/${tenantId}/projects/new?consultantId=${consultant.id}`}
              className="text-sm text-blue-600 hover:underline"
            >
              Add project
            </Link>
          )}
        </div>
        {projects.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No projects.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Client
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Start
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    End
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2">
                      <Link
                        href={`/tenant/${tenantId}/projects/${p.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {p.clientName}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          p.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {new Date(p.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
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

      {/* Recent Timesheets */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Recent Timesheets
        </h2>
        {timesheets.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No timesheets.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Week
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {timesheets.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2 text-gray-700">
                      {new Date(t.weekStart).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary">{t.status}</Badge>
                    </td>
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
