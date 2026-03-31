"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  mfaToken: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  errorParam?: string;
}

const errorMessages: Record<string, string> = {
  unauthorized: "You are not authorized to access that page.",
  CredentialsSignin: "Invalid email, password, or MFA token.",
  default: "An unexpected error occurred. Please try again.",
};

export default function LoginForm({ errorParam }: LoginFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const errorMessage = errorParam
    ? (errorMessages[errorParam] ?? errorMessages.default)
    : null;

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      mfaToken: data.mfaToken ?? "",
      redirect: false,
    });

    if (!result?.ok) {
      if (result?.error === "CredentialsSignin" && !showMfa) {
        // Could be an MFA-required user — show the MFA field and let them retry
        setShowMfa(true);
        setServerError("If MFA is enabled, please enter your 6-digit token.");
        return;
      }
      setServerError(errorMessages.CredentialsSignin);
      return;
    }

    // Redirect based on platformRole
    router.push("/platform/companies");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {(errorMessage || serverError) && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError ?? errorMessage}
        </div>
      )}

      {/* Email */}
      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          disabled={isSubmitting}
        />
        {errors.email && (
          <p className="text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            {...register("password")}
            className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            disabled={isSubmitting}
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
        {errors.password && (
          <p className="text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      {/* MFA Token — shown when needed */}
      {showMfa && (
        <div className="space-y-1">
          <label htmlFor="mfaToken" className="block text-sm font-medium text-gray-700">
            Authenticator Code
          </label>
          <input
            id="mfaToken"
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="000000"
            {...register("mfaToken")}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm tracking-widest shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            disabled={isSubmitting}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
      >
        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
