import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateMFASecret, generateQRCodeUrl } from "@/lib/auth/mfa";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = generateMFASecret();
  const qrCodeUrl = await generateQRCodeUrl(session.user.email, secret);

  return NextResponse.json({ secret, qrCodeUrl });
}
