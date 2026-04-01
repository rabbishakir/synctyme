import { prisma } from "@/lib/db";
import { verifyMFAToken } from "@/lib/auth/mfa";
import { verifyUserPassword } from "@/lib/auth/credentials";

/**
 * Confirms a sensitive action: authenticator code when MFA is configured,
 * or current password. Uses `verifyUserPassword` like login.
 *
 * Resolves the user by `userId` first; if missing (stale/wrong JWT id),
 * falls back to `sessionEmail` so step-up still works when `sub`/`id` drift.
 */
export async function verifyStepUpAuth(
  userId: string,
  body: { mfaToken?: string; reauthPassword?: string },
  sessionEmail?: string | null
): Promise<boolean> {
  const select = {
    id: true,
    email: true,
    mfaEnabled: true,
    mfaSecret: true,
  } as const;

  let user = await prisma.user.findUnique({
    where: { id: userId },
    select,
  });

  if (!user && sessionEmail) {
    const email = sessionEmail.trim();
    if (email.length > 0) {
      user = await prisma.user.findUnique({
        where: { email },
        select,
      });
    }
  }

  if (!user) return false;

  const token = (body.mfaToken ?? "").trim().replace(/\s/g, "");

  const passwordRaw =
    typeof body.reauthPassword === "string" ? body.reauthPassword : "";

  const mfaConfigured = user.mfaEnabled && !!user.mfaSecret;

  if (mfaConfigured && token.length > 0) {
    const totpOk = verifyMFAToken(user.mfaSecret as string, token);
    if (totpOk) return true;
    if (passwordRaw.length === 0) return false;
  }

  if (passwordRaw.length === 0) {
    return false;
  }

  const verified = await verifyUserPassword(user.email, passwordRaw);
  return verified !== null;
}
