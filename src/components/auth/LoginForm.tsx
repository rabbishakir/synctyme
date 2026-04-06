"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const inputClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

const step1Schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const step2Schema = z.object({
  mfaToken: z
    .string()
    .length(6, "Enter the 6-digit code")
    .regex(/^\d+$/, "Digits only"),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

interface LoginFormProps {
  errorParam?: string;
}

const errorMessages: Record<string, string> = {
  unauthorized: "You are not authorized to access that page.",
  "no-access": "Your account is not linked to any company. Contact your administrator.",
  CredentialsSignin: "Invalid email, password, or authenticator code.",
  default: "An unexpected error occurred. Please try again.",
};

export default function LoginForm({ errorParam }: LoginFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ email: string; password: string } | null>(null);

  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema) });
  const form2 = useForm<Step2Data>({ resolver: zodResolver(step2Schema) });

  const errorMessage = errorParam ? (errorMessages[errorParam] ?? errorMessages.default) : null;

  const goBackToStep1 = () => {
    setStep(1);
    setPending(null);
    form2.reset();
    setServerError(null);
  };

  const completeSignIn = async (email: string, password: string, mfaToken: string) => {
    const result = await signIn("credentials", { email, password, mfaToken, redirect: false });
    if (!result?.ok) {
      setServerError(errorMessages.CredentialsSignin);
      return false;
    }
    router.push("/");
    router.refresh();
    return true;
  };

  const onSubmitStep1 = async (data: Step1Data) => {
    setServerError(null);
    const res = await fetch("/api/auth/precheck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email, password: data.password }),
    });

    if (!res.ok) {
      setServerError(errorMessages.CredentialsSignin);
      return;
    }

    const { mfaRequired } = (await res.json()) as { mfaRequired: boolean };

    if (!mfaRequired) {
      await completeSignIn(data.email, data.password, "");
      return;
    }

    setPending({ email: data.email, password: data.password });
    setStep(2);
    setServerError(null);
  };

  const onSubmitStep2 = async (data: Step2Data) => {
    if (!pending) return;
    setServerError(null);
    await completeSignIn(pending.email, pending.password, data.mfaToken);
  };

  const submitting1 = form1.formState.isSubmitting;
  const submitting2 = form2.formState.isSubmitting;
  const busy = submitting1 || submitting2;

  return (
    <div className="space-y-5">
      {(errorMessage || serverError) && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {serverError ?? errorMessage}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={form1.handleSubmit(onSubmitStep1)} className="space-y-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="email">Email address</Label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...form1.register("email")}
              disabled={busy}
              placeholder="you@company.com"
              className={inputClassName}
            />
            {form1.formState.errors.email && (
              <p className="text-xs text-destructive">{form1.formState.errors.email.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                {...form1.register("password")}
                disabled={busy}
                className={`${inputClassName} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form1.formState.errors.password && (
              <p className="text-xs text-destructive">{form1.formState.errors.password.message}</p>
            )}
          </div>

          <Button type="submit" disabled={busy} className="w-full">
            {submitting1 && <Loader2 size={16} className="animate-spin mr-1.5" />}
            {submitting1 ? "Checking..." : "Continue"}
          </Button>
        </form>
      )}

      {step === 2 && pending && (
        <form onSubmit={form2.handleSubmit(onSubmitStep2)} className="space-y-4" noValidate>
          <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Signing in as </span>
            <span className="font-medium text-foreground">{pending.email}</span>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mfaToken">Authenticator code</Label>
            <input
              id="mfaToken"
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              placeholder="000000"
              {...form2.register("mfaToken")}
              disabled={busy}
              className={`${inputClassName} text-center text-lg tracking-widest`}
            />
            {form2.formState.errors.mfaToken && (
              <p className="text-xs text-destructive">{form2.formState.errors.mfaToken.message}</p>
            )}
            <p className="text-xs text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={goBackToStep1} disabled={busy} className="flex-shrink-0">
              <ArrowLeft size={16} className="mr-1" />
              Back
            </Button>
            <Button type="submit" disabled={busy} className="flex-1">
              {submitting2 && <Loader2 size={16} className="animate-spin mr-1.5" />}
              {submitting2 ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
