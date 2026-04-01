"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


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
      router.push("/platform/companies");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{companyName}</h2>
      <p className="mt-1 text-sm text-gray-500">Company ID: {companyId}</p>

      {mode === "view" && deletionRequest && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Deletion request</p>
          <p className="mt-1">
            Status:{" "}
            <strong>{deletionRequest.status.replace(/_/g, " ")}</strong>
          </p>
          <p className="mt-2 text-amber-950/90">{deletionRequest.reason}</p>
        </div>
      )}

      {mode === "view" && !deletionRequest && (
        <p className="mt-4 text-sm text-gray-600">
          No deletion workflow is active for this company.
        </p>
      )}

      {mode === "initiate" && (
        <form className="mt-6 space-y-4" onSubmit={initiate}>
          <p className="text-sm text-gray-600">
            This creates a pending deletion request and marks the company as
            pending deletion. A System Admin must approve it before the company
            is archived.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this company being deleted?"
              aria-label="Deletion reason"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading || !reason.trim()}>
            {loading ? "Submitting…" : "Initiate deletion"}
          </Button>
        </form>
      )}

      {mode === "review" && deletionRequest && (
        <div className="mt-6 space-y-4">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Request</p>
            <p className="text-sm text-gray-800">
              Status: {deletionRequest.status.replace(/_/g, " ")}
            </p>
            <p className="mt-2 text-sm text-gray-800">
              <span className="text-gray-500">Reason: </span>
              {deletionRequest.reason}
            </p>
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => review("approve")}
              disabled={loading}
            >
              {loading ? "Processing…" : "Approve"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => review("reject")}
              disabled={loading}
            >
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
