"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface SubmitPreviewProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  weekStart: string;
  totalHours: number;
  payRate: string | null;
  clientName: string;
  uploadedFileName: string | null;
}

function formatWeekRange(weekStartStr: string): string {
  const start = new Date(weekStartStr);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function SubmitPreview({
  open,
  onClose,
  onConfirm,
  loading = false,
  weekStart,
  totalHours,
  payRate,
  clientName,
  uploadedFileName,
}: SubmitPreviewProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Timesheet</DialogTitle>
          <DialogDescription>Review the details before submitting.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Row label="Week" value={formatWeekRange(weekStart)} />
          <Row label="Total hours" value={totalHours.toFixed(2)} />
          <Row label="Pay rate" value={payRate ? `$${payRate}/hr` : "N/A"} />
          <Row label="Project" value={clientName} />
          <Row label="Document" value={uploadedFileName ?? "None"} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 size={15} className="animate-spin mr-1.5" />}
            {loading ? "Submitting..." : "Confirm & Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm py-1.5 border-b border-border last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
