"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ConsultantOption {
  id: string;
  name: string;
  consultantCode: string;
}

export default function NewProjectForm({
  tenantId,
  consultants,
  defaultConsultantId,
  showRateFields,
}: {
  tenantId: string;
  consultants: ConsultantOption[];
  defaultConsultantId?: string;
  showRateFields: boolean;
}) {
  const router = useRouter();
  const [consultantId, setConsultantId] = useState(defaultConsultantId ?? "");
  const [clientName, setClientName] = useState("");
  const [clientLocation, setClientLocation] = useState("");
  const [midClient, setMidClient] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [payRate, setPayRate] = useState("");
  const [incentiveRate, setIncentiveRate] = useState("");
  const [workAuthDetails, setWorkAuthDetails] = useState("");
  const [recruiter, setRecruiter] = useState("");
  const [marketer, setMarketer] = useState("");
  const [clientApprovedTimesheetRequired, setClientApprovedTimesheetRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${tenantId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultantId,
          clientName,
          clientLocation: clientLocation || undefined,
          midClient: midClient || undefined,
          startDate,
          endDate: endDate || undefined,
          payRate: payRate || "0",
          incentiveRate: incentiveRate || undefined,
          workAuthDetails: workAuthDetails || undefined,
          recruiter: recruiter || undefined,
          marketer: marketer || undefined,
          clientApprovedTimesheetRequired,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to create project");
        return;
      }
      toast.success("Project created successfully");
      router.push(`/tenant/${tenantId}/projects/${data.project.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      {/* Assignment */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">Assignment</legend>
        <div className="grid gap-2">
          <Label htmlFor="consultant">Consultant <span className="text-destructive">*</span></Label>
          <select
            id="consultant"
            value={consultantId}
            onChange={(e) => setConsultantId(e.target.value)}
            required
            className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="">Select consultant...</option>
            {consultants.map((c) => (
              <option key={c.id} value={c.id}>{c.consultantCode} — {c.name}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="clientName">Client Name <span className="text-destructive">*</span></Label>
          <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} required placeholder="Microsoft" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="clientLocation">Client Location</Label>
            <Input id="clientLocation" value={clientLocation} onChange={(e) => setClientLocation(e.target.value)} placeholder="Seattle, WA" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="midClient">Mid Client</Label>
            <Input id="midClient" value={midClient} onChange={(e) => setMidClient(e.target.value)} />
          </div>
        </div>
      </fieldset>

      {/* Dates */}
      <fieldset className="space-y-4 border-t border-border pt-4">
        <legend className="text-sm font-semibold text-foreground">Dates</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="startDate">Start Date <span className="text-destructive">*</span></Label>
            <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </fieldset>

      {/* Rates */}
      <fieldset className="space-y-4 border-t border-border pt-4">
        <legend className="text-sm font-semibold text-foreground">Rates</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="payRate">Pay Rate <span className="text-destructive">*</span></Label>
            <Input id="payRate" type="number" step="0.01" min="0" value={payRate} onChange={(e) => setPayRate(e.target.value)} required disabled={!showRateFields} placeholder="50.00" />
            {!showRateFields && <p className="text-xs text-muted-foreground">Only Accounts can set rates</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="incentiveRate">Incentive Rate</Label>
            <Input id="incentiveRate" type="number" step="0.01" min="0" value={incentiveRate} onChange={(e) => setIncentiveRate(e.target.value)} disabled={!showRateFields} placeholder="5.00" />
          </div>
        </div>
      </fieldset>

      {/* Additional */}
      <fieldset className="space-y-4 border-t border-border pt-4">
        <legend className="text-sm font-semibold text-foreground">Additional Details</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="recruiter">Recruiter</Label>
            <Input id="recruiter" value={recruiter} onChange={(e) => setRecruiter(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="marketer">Marketer</Label>
            <Input id="marketer" value={marketer} onChange={(e) => setMarketer(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="workAuth">Work Authorization Details</Label>
          <Input id="workAuth" value={workAuthDetails} onChange={(e) => setWorkAuthDetails(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="clientApproved"
            type="checkbox"
            checked={clientApprovedTimesheetRequired}
            onChange={(e) => setClientApprovedTimesheetRequired(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <Label htmlFor="clientApproved">Client-approved timesheet required</Label>
        </div>
      </fieldset>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 size={15} className="animate-spin mr-1.5" />}
          {loading ? "Creating..." : "Create Project"}
        </Button>
      </div>
    </form>
  );
}
