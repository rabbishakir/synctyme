"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  SUBMITTED: "default",
  APPROVED: "default",
  REJECTED: "destructive",
  LOCKED: "secondary",
  ACTIVE: "default",
  COMPLETED: "secondary",
};

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
      const res = await fetch(`/api/tenant/${tenantId}/projects/${project.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payRate: newPayRate, incentiveRate: newIncentiveRate || undefined, effectiveDate: newEffectiveDate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Failed to add rate"); return; }
      toast.success("Rate added successfully");
      setShowRateForm(false);
      setNewPayRate("");
      setNewIncentiveRate("");
      setNewEffectiveDate("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { label: "Client", value: project.clientName },
    { label: "Consultant", value: `${project.consultant.consultantCode} — ${project.consultant.name}` },
    project.clientLocation && { label: "Location", value: project.clientLocation },
    project.midClient && { label: "Mid Client", value: project.midClient },
    { label: "Start Date", value: new Date(project.startDate).toLocaleDateString() },
    { label: "End Date", value: project.endDate ? new Date(project.endDate).toLocaleDateString() : "—" },
    project.recruiter && { label: "Recruiter", value: project.recruiter },
    project.marketer && { label: "Marketer", value: project.marketer },
    { label: "Client Approved TS", value: project.clientApprovedTimesheetRequired ? "Required" : "Not required" },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="space-y-6">
      {/* Project Details */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Project Details</h2>
          <Badge variant={project.status === "ACTIVE" ? "default" : "secondary"}>{project.status}</Badge>
        </div>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.label}>
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{f.label}</dt>
              <dd className="mt-1 text-sm text-foreground">{f.value}</dd>
            </div>
          ))}
          {project.workAuthDetails && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Work Auth</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{project.workAuthDetails}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Rate History */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Rate History</h2>
          {canChangeRate && !showRateForm && (
            <Button size="sm" onClick={() => setShowRateForm(true)}>Change Rate</Button>
          )}
        </div>

        {showRateForm && (
          <form onSubmit={addRate} className="mt-4 space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="grid gap-1">
                <Label htmlFor="newPayRate" className="text-xs">Pay Rate <span className="text-destructive">*</span></Label>
                <Input id="newPayRate" type="number" step="0.01" min="0" value={newPayRate} onChange={(e) => setNewPayRate(e.target.value)} required />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="newIncentiveRate" className="text-xs">Incentive Rate</Label>
                <Input id="newIncentiveRate" type="number" step="0.01" min="0" value={newIncentiveRate} onChange={(e) => setNewIncentiveRate(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="newEffectiveDate" className="text-xs">Effective Date <span className="text-destructive">*</span></Label>
                <Input id="newEffectiveDate" type="date" value={newEffectiveDate} onChange={(e) => setNewEffectiveDate(e.target.value)} required />
              </div>
            </div>
            {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading}>
                {loading && <Loader2 size={14} className="animate-spin mr-1" />}
                {loading ? "Adding..." : "Add Rate"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowRateForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        {rateHistory.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No rate history.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Effective</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Pay Rate</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Incentive</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rateHistory.map((r, i) => (
                  <tr key={r.id} className={i === 0 ? "bg-primary/5" : "hover:bg-muted/30 transition-colors"}>
                    <td className="px-3 py-2 font-medium text-foreground">{new Date(r.effectiveDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2 tabular-nums text-foreground">${parseFloat(r.payRate).toFixed(2)}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground hidden sm:table-cell">{r.incentiveRate ? `$${parseFloat(r.incentiveRate).toFixed(2)}` : "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Timesheets */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Timesheets</h2>
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
