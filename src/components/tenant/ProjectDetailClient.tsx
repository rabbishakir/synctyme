"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ProjectData {
  id: string;
  clientName: string;
  clientLocation: string | null;
  midClient: string | null;
  startDate: string;
  endDate: string | null;
  workAuthDetails: string | null;
  recruiter: string | null;
  marketer: string | null;
  clientApprovedTimesheetRequired: boolean;
  status: string;
  consultant: { id: string; name: string; consultantCode: string };
}

interface RateRow {
  id: string;
  payRate: string;
  incentiveRate: string | null;
  effectiveDate: string;
  createdAt: string;
}

interface TimesheetRow {
  id: string;
  weekStart: string;
  status: string;
}

export default function ProjectDetailClient({
  project,
  rateHistory,
  timesheets,
  tenantId,
  canChangeRate,
}: {
  project: ProjectData;
  rateHistory: RateRow[];
  timesheets: TimesheetRow[];
  tenantId: string;
  canChangeRate: boolean;
}) {
  const router = useRouter();
  const [showRateForm, setShowRateForm] = useState(false);
  const [newPayRate, setNewPayRate] = useState("");
  const [newIncentiveRate, setNewIncentiveRate] = useState("");
  const [newEffectiveDate, setNewEffectiveDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addRate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tenant/${tenantId}/projects/${project.id}/rate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payRate: newPayRate,
            incentiveRate: newIncentiveRate || undefined,
            effectiveDate: newEffectiveDate,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to add rate");
        return;
      }
      setShowRateForm(false);
      setNewPayRate("");
      setNewIncentiveRate("");
      setNewEffectiveDate("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Project Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Project Details
          </h2>
          <Badge
            variant={project.status === "ACTIVE" ? "default" : "secondary"}
          >
            {project.status}
          </Badge>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500 uppercase">Client</dt>
            <dd className="mt-1 text-sm">{project.clientName}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase">Consultant</dt>
            <dd className="mt-1 text-sm">
              {project.consultant.consultantCode} —{" "}
              {project.consultant.name}
            </dd>
          </div>
          {project.clientLocation && (
            <div>
              <dt className="text-xs text-gray-500 uppercase">Location</dt>
              <dd className="mt-1 text-sm">{project.clientLocation}</dd>
            </div>
          )}
          {project.midClient && (
            <div>
              <dt className="text-xs text-gray-500 uppercase">Mid Client</dt>
              <dd className="mt-1 text-sm">{project.midClient}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-gray-500 uppercase">Start Date</dt>
            <dd className="mt-1 text-sm">
              {new Date(project.startDate).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase">End Date</dt>
            <dd className="mt-1 text-sm">
              {project.endDate
                ? new Date(project.endDate).toLocaleDateString()
                : "—"}
            </dd>
          </div>
          {project.recruiter && (
            <div>
              <dt className="text-xs text-gray-500 uppercase">Recruiter</dt>
              <dd className="mt-1 text-sm">{project.recruiter}</dd>
            </div>
          )}
          {project.marketer && (
            <div>
              <dt className="text-xs text-gray-500 uppercase">Marketer</dt>
              <dd className="mt-1 text-sm">{project.marketer}</dd>
            </div>
          )}
          {project.workAuthDetails && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-500 uppercase">Work Auth</dt>
              <dd className="mt-1 text-sm">{project.workAuthDetails}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-gray-500 uppercase">
              Client Approved TS
            </dt>
            <dd className="mt-1 text-sm">
              {project.clientApprovedTimesheetRequired
                ? "Required"
                : "Not required"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Rate History */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Rate History
          </h2>
          {canChangeRate && !showRateForm && (
            <Button size="sm" onClick={() => setShowRateForm(true)}>
              Change Rate
            </Button>
          )}
        </div>

        {showRateForm && (
          <form
            onSubmit={addRate}
            className="mt-4 space-y-3 rounded-lg border border-blue-100 bg-blue-50/30 p-4"
          >
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1">
                <Label htmlFor="newPayRate" className="text-xs">
                  Pay Rate *
                </Label>
                <Input
                  id="newPayRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPayRate}
                  onChange={(e) => setNewPayRate(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="newIncentiveRate" className="text-xs">
                  Incentive Rate
                </Label>
                <Input
                  id="newIncentiveRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newIncentiveRate}
                  onChange={(e) => setNewIncentiveRate(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="newEffectiveDate" className="text-xs">
                  Effective Date *
                </Label>
                <Input
                  id="newEffectiveDate"
                  type="date"
                  value={newEffectiveDate}
                  onChange={(e) => setNewEffectiveDate(e.target.value)}
                  required
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? "Adding..." : "Add Rate"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowRateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {rateHistory.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No rate history.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Effective Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Pay Rate
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Incentive Rate
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Added
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rateHistory.map((r, i) => (
                  <tr
                    key={r.id}
                    className={i === 0 ? "bg-blue-50/30" : ""}
                  >
                    <td className="px-3 py-2 font-medium">
                      {new Date(r.effectiveDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      ${parseFloat(r.payRate).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      {r.incentiveRate
                        ? `$${parseFloat(r.incentiveRate).toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Timesheets */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Timesheets</h2>
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
                    <td className="px-3 py-2">
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
