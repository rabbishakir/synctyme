"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Loader2, Copy, Check, CheckCircle2, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const inputClassName =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

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
    reset,
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
        setServerError(`Unexpected response from server (${res.status}). Try again or check the server logs.`);
        return;
      }
    } else if (!res.ok) {
      setServerError(`Request failed (${res.status}).`);
      return;
    }

    if (!res.ok) {
      setServerError(typeof body.error === "string" ? body.error : "Failed to create company.");
      return;
    }

    if (!body.tempPassword || !body.adminEmail || !body.company?.name) {
      setServerError("Company was created but the response was incomplete. Check the companies list.");
      return;
    }

    toast.success("Company created successfully!");
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
    toast.success("Password copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (result) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-emerald-900">Company created successfully</h2>
              <p className="text-sm text-emerald-700">&quot;{result.companyName}&quot; is ready to use</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Admin email</span>
              <span className="font-mono font-medium text-foreground">{result.adminEmail}</span>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Temporary password</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3">
                <code className="flex-1 text-sm font-mono tracking-widest text-foreground">{result.tempPassword}</code>
                <button
                  onClick={copyPassword}
                  className="flex items-center gap-1.5 rounded-md bg-card border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-amber-600">
                Save this password — it will not be shown again.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-border pt-5">
            <Button onClick={() => router.push("/platform/companies")}>
              <Building2 size={15} className="mr-1.5" />
              View Companies
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setCopied(false);
                setServerError(null);
                reset();
              }}
            >
              Create Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-0 rounded-xl border border-border bg-card shadow-sm overflow-hidden" noValidate>
      {serverError && (
        <div className="mx-6 mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* Section 1: Company Information */}
      <fieldset className="px-6 py-5 space-y-4 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Company Information</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Basic details about the new company tenant</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="companyName">
            Company Name <span className="text-destructive">*</span>
          </Label>
          <input
            id="companyName"
            {...register("companyName")}
            placeholder="Acme Corp"
            disabled={isSubmitting}
            className={inputClassName}
          />
          <p className="text-xs text-muted-foreground">This will be displayed across the platform</p>
          {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
        </div>
      </fieldset>

      {/* Section 2: Admin Account */}
      <fieldset className="px-6 py-5 space-y-4 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Company Admin</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A temporary password will be generated and shown after creation
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="adminName">
              Admin Name <span className="text-destructive">*</span>
            </Label>
            <input
              id="adminName"
              {...register("adminName")}
              placeholder="Jane Smith"
              disabled={isSubmitting}
              className={inputClassName}
            />
            {errors.adminName && <p className="text-xs text-destructive">{errors.adminName.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adminEmail">
              Admin Email <span className="text-destructive">*</span>
            </Label>
            <input
              id="adminEmail"
              type="email"
              {...register("adminEmail")}
              placeholder="admin@company.com"
              disabled={isSubmitting}
              className={inputClassName}
            />
            {errors.adminEmail && <p className="text-xs text-destructive">{errors.adminEmail.message}</p>}
          </div>
        </div>
      </fieldset>

      {/* Form footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-muted/30">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/platform/companies")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 size={15} className="animate-spin mr-1.5" />
          ) : (
            <ArrowRight size={15} className="mr-1.5" />
          )}
          {isSubmitting ? "Creating..." : "Create Company"}
        </Button>
      </div>
    </form>
  );
}
