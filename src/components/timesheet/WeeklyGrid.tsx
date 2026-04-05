"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface GridEntry {
  date: string;
  hours: number;
}

interface WeeklyGridProps {
  timesheetId: string;
  consultantId: string;
  projectId: string;
  weekStart: string;
  entries: GridEntry[];
  onSave: (entries: GridEntry[]) => Promise<void>;
  disabled?: boolean;
  disabledDates?: Set<string>;
  validationErrors?: Record<string, string>;
}

function getWeekDates(weekStartStr: string): Date[] {
  const d = new Date(weekStartStr);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d);
    day.setUTCDate(d.getUTCDate() + i);
    return day;
  });
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function WeeklyGrid({
  weekStart,
  entries,
  onSave,
  disabled = false,
  disabledDates = new Set(),
  validationErrors = {},
}: WeeklyGridProps) {
  const weekDates = getWeekDates(weekStart);

  const initialHours: Record<string, number> = {};
  for (const e of entries) {
    initialHours[e.date.slice(0, 10)] = e.hours;
  }

  const [hours, setHours] = useState<Record<string, number>>(initialHours);
  const [saving, setSaving] = useState(false);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const next: Record<string, number> = {};
    for (const e of entries) {
      next[e.date.slice(0, 10)] = e.hours;
    }
    setHours(next);
  }, [entries]);

  const debouncedSave = useCallback(
    (updated: Record<string, number>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const gridEntries: GridEntry[] = Object.entries(updated)
          .filter(([, h]) => h > 0)
          .map(([date, h]) => ({ date, hours: h }));
        setSaving(true);
        try {
          await onSave(gridEntries);
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [onSave]
  );

  function handleChange(dateKey: string, raw: string) {
    const parsed = parseFloat(raw);
    const newErrors = { ...localErrors };

    if (raw === "" || raw === "0") {
      delete newErrors[dateKey];
      setLocalErrors(newErrors);
      const updated = { ...hours, [dateKey]: 0 };
      setHours(updated);
      debouncedSave(updated);
      return;
    }

    if (isNaN(parsed) || parsed < 0 || parsed > 24) {
      newErrors[dateKey] = "0–24";
      setLocalErrors(newErrors);
      return;
    }

    delete newErrors[dateKey];
    setLocalErrors(newErrors);

    const rounded = Math.round(parsed * 100) / 100;
    const updated = { ...hours, [dateKey]: rounded };
    setHours(updated);
    debouncedSave(updated);
  }

  const dailyTotals = weekDates.map((d) => hours[toDateKey(d)] ?? 0);
  const weeklyTotal = dailyTotals.reduce((a, b) => a + b, 0);

  const mergedErrors = { ...validationErrors, ...localErrors };

  return (
    <div className="space-y-1">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/50">
            <tr>
              {weekDates.map((d, i) => (
                <th
                  key={i}
                  className="px-3 py-2.5 text-center font-medium text-gray-600 min-w-[90px]"
                >
                  <div>{DAY_LABELS[i]}</div>
                  <div className="text-xs text-gray-400 font-normal">
                    {d.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </div>
                </th>
              ))}
              <th className="px-3 py-2.5 text-center font-medium text-gray-600 min-w-[80px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {weekDates.map((d, i) => {
                const key = toDateKey(d);
                const isDisabled = disabled || disabledDates.has(key);
                const hasError = !!mergedErrors[key];
                return (
                  <td key={i} className="px-2 py-2 text-center">
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      max="24"
                      value={hours[key] ?? ""}
                      onChange={(e) => handleChange(key, e.target.value)}
                      disabled={isDisabled}
                      aria-invalid={hasError}
                      className={`text-center w-full ${isDisabled ? "bg-gray-100 text-gray-400" : ""}`}
                    />
                    {hasError && (
                      <p className="mt-0.5 text-[10px] text-red-500">
                        {mergedErrors[key]}
                      </p>
                    )}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center font-semibold text-gray-800">
                {weeklyTotal.toFixed(2)}
              </td>
            </tr>
            <tr className="border-t border-gray-100 bg-gray-50/30">
              {dailyTotals.map((t, i) => (
                <td
                  key={i}
                  className="px-3 py-1.5 text-center text-xs font-medium text-gray-500"
                >
                  {t.toFixed(2)}
                </td>
              ))}
              <td className="px-3 py-1.5 text-center text-xs font-bold text-gray-700">
                {weeklyTotal.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {saving && (
        <p className="text-xs text-gray-400 text-right">Saving...</p>
      )}
    </div>
  );
}
