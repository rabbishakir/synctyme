"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";

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
  /** Held only between step 1 (MFA required) and step 2; cleared after sign-in or back. */
  const [pending, setPending] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
  });

  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
  });

  const errorMessage = errorParam
    ? (errorMessages[errorParam] ?? errorMessages.default)
    : null;

  const goBackToStep1 = () => {
    setStep(1);
    setPending(null);
    form2.reset();
    setServerError(null);
  };

  const completeSignIn = async (
    email: string,
    password: string,
    mfaToken: string
  ) => {
    const result = await signIn("credentials", {
      email,
      password,
      mfaToken,
      redirect: false,
    });

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
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError ?? errorMessage}
        </div>
      )}

      {step === 1 && (
        <form
          onSubmit={form1.handleSubmit(onSubmitStep1)}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...form1.register("email")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              disabled={busy}
            />
            {form1.formState.errors.email && (
              <p className="text-xs text-red-600">
                {form1.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                {...form1.register("password")}
                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form1.formState.errors.password && (
              <p className="text-xs text-red-600">
                {form1.formState.errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {submitting1 && <Loader2 size={16} className="animate-spin" />}
            {submitting1 ? "Checking…" : "Continue"}
          </button>
        </form>
      )}

      {step === 2 && pending && (
        <form
          onSubmit={form2.handleSubmit(onSubmitStep2)}
          className="space-y-5"
          noValidate
        >
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <span className="text-gray-500">Signing in as </span>
            <span className="font-medium">{pending.email}</span>
          </div>

          <div className="space-y-1">
            <label htmlFor="mfaToken" className="block text-sm font-medium text-gray-700">
              Authenticator code
            </label>
            <input
              id="mfaToken"
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              placeholder="000000"
              {...form2.register("mfaToken")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-widest shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              disabled={busy}
            />
            {form2.formState.errors.mfaToken && (
              <p className="text-xs text-red-600">
                {form2.formState.errors.mfaToken.message}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              type="button"
              onClick={goBackToStep1}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
            >
              {submitting2 && <Loader2 size={16} className="animate-spin" />}
              {submitting2 ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
