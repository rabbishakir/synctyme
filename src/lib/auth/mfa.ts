import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

const ISSUER = "SyncTyme";

export function generateMFASecret(): string {
  return new OTPAuth.Secret().base32;
}

export async function generateQRCodeUrl(
  email: string,
  secret: string
): Promise<string> {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  return QRCode.toDataURL(totp.toString());
}

export function verifyMFAToken(secret: string, token: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      label: "user",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // window: 1 allows 1 period before/after for clock drift
    return totp.validate({ token, window: 1 }) !== null;
  } catch {
    return false;
  }
}
