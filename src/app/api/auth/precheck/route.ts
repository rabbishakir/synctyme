import { NextRequest, NextResponse } from "next/server";
import { verifyUserPassword } from "@/lib/auth/credentials";

/**
 * Step 1 of login: validates email/password only.
 * If valid and MFA is enabled, client shows the MFA step; otherwise client calls signIn directly.
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const user = await verifyUserPassword(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  return NextResponse.json({ mfaRequired: user.mfaEnabled });
}
