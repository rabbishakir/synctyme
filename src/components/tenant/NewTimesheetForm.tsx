"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ProjectOption {
  id: string;
  clientName: string;
}

export default function NewTimesheetForm({
  tenantId,
  projects,
}: {
  tenantId: string;
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState("");
  const [weekStartStr, setWeekStartStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextSundays = useMemo(() => {
    const sundays: string[] = [];
    const today = new Date();
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    d.setUTCHours(0, 0, 0, 0);

    for (let i = -4; i <= 4; i++) {
      const s = new Date(d);
      s.setUTCDate(d.getUTCDate() + i * 7);
      sundays.push(s.toISOString().slice(0, 10));
    }
    return sundays;
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!projectId) {
      setError("Please select a project");
      return;
    }
    if (!weekStartStr) {
      setError("Please select a week");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${tenantId}/timesheets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, weekStart: weekStartStr }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.timesheetId) {
          router.push(`/tenant/${tenantId}/timesheets/${data.timesheetId}`);
          return;
        }
        setError(data.error ?? "Failed to create timesheet");
        return;
      }

      router.push(`/tenant/${tenantId}/timesheets/${data.timesheet.id}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Project
        </label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Select a project...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.clientName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Week starting (Sunday)
        </label>
        <select
          value={weekStartStr}
          onChange={(e) => setWeekStartStr(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Select a week...</option>
          {nextSundays.map((s) => {
            const start = new Date(s);
            const end = new Date(start);
            end.setUTCDate(start.getUTCDate() + 6);
            const fmt = (d: Date) =>
              d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              });
            return (
              <option key={s} value={s}>
                {fmt(start)} – {fmt(end)}
              </option>
            );
          })}
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Timesheet"}
      </Button>
    </form>
  );
}
