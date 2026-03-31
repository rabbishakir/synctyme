"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";

const mfaSchema = z.object({
  token: z
    .string()
    .length(6, "Token must be exactly 6 digits")
    .regex(/^\d+$/, "Token must contain only digits"),
});

type MfaFormData = z.infer<typeof mfaSchema>;

export default function MfaSetupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MfaFormData>({ resolver: zodResolver(mfaSchema) });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchQrCode();
    }
  }, [status]);

  async function fetchQrCode() {
    try {
      const res = await fetch("/api/auth/mfa/setup", { method: "GET" });
      const data = await res.json();
      setQrCodeUrl(data.qrCodeUrl);
      setSecret(data.secret);
    } catch {
      setServerError("Failed to generate MFA secret. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (data: MfaFormData) => {
    setServerError(null);
    const res = await fetch("/api/auth/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: data.token, secret }),
    });

    if (!res.ok) {
      const body = await res.json();
      setServerError(body.error ?? "Verification failed. Try again.");
      return;
    }

    setVerified(true);
    setTimeout(() => router.push("/platform/companies"), 2000);
  };

  if (status === "loading" || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </main>
    );
  }

  if (!session) return null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-blue-600" />
          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            Set Up Two-Factor Authentication
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Scan the QR code with your authenticator app, then enter the 6-digit
            code to verify.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm space-y-6">
          {verified ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <ShieldCheck className="h-12 w-12 text-green-500" />
              <p className="font-semibold text-green-700">
                MFA enabled successfully! Redirecting…
              </p>
            </div>
          ) : (
            <>
              {/* QR Code */}
              {qrCodeUrl && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeUrl} alt="MFA QR Code" className="h-48 w-48 rounded-md border" />
                </div>
              )}

              {/* Manual entry */}
              {secret && (
                <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">
                    Or enter this code manually:
                  </p>
                  <p className="font-mono text-sm font-semibold tracking-widest text-gray-800 break-all">
                    {secret}
                  </p>
                </div>
              )}

              {serverError && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <label
                    htmlFor="token"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Verification Code
                  </label>
                  <input
                    id="token"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    {...register("token")}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-widest shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {errors.token && (
                    <p className="text-xs text-red-600">{errors.token.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {isSubmitting ? "Verifying…" : "Enable MFA"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
