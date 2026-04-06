"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CompanyDeleteClientProps {
  companyId: string;
  companyName: string;
  mode: "initiate" | "review" | "view";
  deletionRequest: {
    id: string;
    status: string;
    reason: string;
  } | null;
}

export default function CompanyDeleteClient({
  companyId,
  companyName,
  mode,
  deletionRequest,
}: CompanyDeleteClientProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function initiate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/companies/${companyId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Request failed");
        return;
      }
      toast.success("Deletion request submitted");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function review(decision: "approve" | "reject") {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/companies/${companyId}/delete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Request failed");
        return;
      }
      toast.success(`Deletion ${decision}d`);
      router.push("/platform/companies");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">{companyName}</h2>
      <p className="mt-1 text-xs text-muted-foreground font-mono">ID: {companyId}</p>

      {mode === "view" && deletionRequest && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Deletion request</p>
          <p className="mt-1">Status: <strong>{deletionRequest.status.replace(/_/g, " ")}</strong></p>
          <p className="mt-2">{deletionRequest.reason}</p>
        </div>
      )}

      {mode === "view" && !deletionRequest && (
        <p className="mt-4 text-sm text-muted-foreground">No deletion workflow is active for this company.</p>
      )}

      {mode === "initiate" && (
        <form className="mt-5 space-y-4" onSubmit={initiate}>
          <p className="text-sm text-muted-foreground">
            This creates a pending deletion request. A System Admin must approve it before the company is archived.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason <span className="text-destructive">*</span></Label>
            <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this company being deleted?" />
          </div>
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</div>
          )}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={loading || !reason.trim()}>
              {loading && <Loader2 size={15} className="animate-spin mr-1.5" />}
              {loading ? "Submitting..." : "Initiate Deletion"}
            </Button>
          </div>
        </form>
      )}

      {mode === "review" && deletionRequest && (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Request details</p>
            <p className="mt-1 text-sm text-foreground">Status: {deletionRequest.status.replace(/_/g, " ")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{deletionRequest.reason}</p>
          </div>
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => review("approve")} disabled={loading}>
              {loading && <Loader2 size={15} className="animate-spin mr-1.5" />}
              Approve
            </Button>
            <Button variant="outline" onClick={() => review("reject")} disabled={loading}>Reject</Button>
          </div>
        </div>
      )}
    </div>
  );
}
