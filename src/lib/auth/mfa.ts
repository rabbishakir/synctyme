import { authenticator } from "otplib";
import QRCode from "qrcode";

export function generateMFASecret(): string {
  return authenticator.generateSecret();
}

export async function generateQRCodeUrl(
  email: string,
  secret: string
): Promise<string> {
  const otpAuthUrl = authenticator.keyuri(email, "SyncTyme", secret);
  return QRCode.toDataURL(otpAuthUrl);
}

export function verifyMFAToken(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}
