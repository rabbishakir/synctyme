"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Loader2, Copy, Check } from "lucide-react";

const companySchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  adminEmail: z.string().email("Enter a valid email address"),
  adminName: z.string().min(2, "Admin name must be at least 2 characters"),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CreatedResult {
  tempPassword: string;
  adminEmail: string;
  companyName: string;
}

export default function CompanyCreateForm() {
  const router = useRouter();
  const [result, setResult] = useState<CreatedResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormData>({ resolver: zodResolver(companySchema) });

  const onSubmit = async (data: CompanyFormData) => {
    setServerError(null);
    const res = await fetch("/api/platform/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "same-origin",
    });

    const raw = await res.text();
    let body: {
      error?: string;
      tempPassword?: string;
      adminEmail?: string;
      company?: { name: string };
    } = {};

    if (raw.trim()) {
      try {
        body = JSON.parse(raw) as typeof body;
      } catch {
        setServerError(
          `Unexpected response from server (${res.status}). Try again or check the server logs.`
        );
        return;
      }
    } else if (!res.ok) {
      setServerError(`Request failed (${res.status}).`);
      return;
    }

    if (!res.ok) {
      setServerError(
        typeof body.error === "string" ? body.error : "Failed to create company."
      );
      return;
    }

    if (!body.tempPassword || !body.adminEmail || !body.company?.name) {
      setServerError(
        "Company was created but the response was incomplete. Check the companies list."
      );
      return;
    }

    setResult({
      tempPassword: body.tempPassword,
      adminEmail: body.adminEmail,
      companyName: body.company.name,
    });
  };

  const copyPassword = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (result) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 space-y-4">
        <h2 className="text-lg font-semibold text-green-800">
          ✅ Company &quot;{result.companyName}&quot; created successfully
        </h2>
        <p className="text-sm text-gray-700">
          Admin account created for{" "}
          <span className="font-mono font-semibold">{result.adminEmail}</span>.
          Share the temporary password below with them — it will not be shown
          again.
        </p>
        <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-3">
          <span className="flex-1 font-mono text-sm tracking-widest">
            {result.tempPassword}
          </span>
          <button
            onClick={copyPassword}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            {copied ? (
              <Check size={15} className="text-green-500" />
            ) : (
              <Copy size={15} />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <button
          onClick={() => router.push("/platform/companies")}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Back to Companies
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
          Company Name
        </label>
        <input
          id="companyName"
          type="text"
          {...register("companyName")}
          placeholder="Acme Corp"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          disabled={isSubmitting}
        />
        {errors.companyName && (
          <p className="text-xs text-red-600">{errors.companyName.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">
          Admin Email
        </label>
        <input
          id="adminEmail"
          type="email"
          {...register("adminEmail")}
          placeholder="admin@company.com"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          disabled={isSubmitting}
        />
        {errors.adminEmail && (
          <p className="text-xs text-red-600">{errors.adminEmail.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="adminName" className="block text-sm font-medium text-gray-700">
          Admin Name
        </label>
        <input
          id="adminName"
          type="text"
          {...register("adminName")}
          placeholder="Jane Smith"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          disabled={isSubmitting}
        />
        {errors.adminName && (
          <p className="text-xs text-red-600">{errors.adminName.message}</p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? "Creating…" : "Create Company"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/platform/companies")}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
