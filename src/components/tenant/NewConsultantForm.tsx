"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function NewConsultantForm({
  tenantId,
}: {
  tenantId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [internalTimesheetRequired, setInternalTimesheetRequired] =
    useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${tenantId}/consultants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, internalTimesheetRequired }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to create consultant");
        return;
      }
      toast.success("Consultant created successfully");
      router.push(`/tenant/${tenantId}/consultants/${data.consultant.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="grid gap-2">
        <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Smith" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="john@example.com" />
        <p className="text-xs text-muted-foreground">An account will be created with a temporary password.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">Phone <span className="text-destructive">*</span></Label>
        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="555-0100" />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="internalTimesheet"
          type="checkbox"
          checked={internalTimesheetRequired}
          onChange={(e) => setInternalTimesheetRequired(e.target.checked)}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        <Label htmlFor="internalTimesheet">Internal timesheet required</Label>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 size={15} className="animate-spin mr-1.5" />}
          {loading ? "Creating..." : "Create Consultant"}
        </Button>
      </div>
    </form>
  );
}
