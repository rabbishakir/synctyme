"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!session) return null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
            <ShieldCheck size={20} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Two-Factor Authentication
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scan the QR code with your authenticator app, then verify with the 6-digit code.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          {verified ? (
            <div className="flex flex-col items-center gap-3 text-center py-4">
              <CheckCircle className="h-12 w-12 text-emerald-500" />
              <p className="font-semibold text-emerald-700">MFA enabled successfully! Redirecting...</p>
            </div>
          ) : (
            <>
              {qrCodeUrl && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeUrl} alt="MFA QR Code" className="h-48 w-48 rounded-lg border border-border" />
                </div>
              )}

              {secret && (
                <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Or enter this code manually:</p>
                  <p className="font-mono text-sm font-semibold tracking-widest text-foreground break-all">{secret}</p>
                </div>
              )}

              {serverError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="token">Verification Code</Label>
                  <input
                    id="token"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    {...register("token")}
                    className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-center text-lg tracking-widest"
                  />
                  {errors.token && <p className="text-xs text-destructive">{errors.token.message}</p>}
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting && <Loader2 size={16} className="animate-spin mr-1.5" />}
                  {isSubmitting ? "Verifying..." : "Enable MFA"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
