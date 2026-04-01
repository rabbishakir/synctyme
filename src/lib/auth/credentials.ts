import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

/** Returns the user if email/password match; otherwise null. */
export async function verifyUserPassword(
  email: string,
  password: string
): Promise<User | null> {
  const trimmed = email.trim();
  const user = await prisma.user.findUnique({
    where: { email: trimmed },
  });
  if (!user) return null;
  let passwordMatch = await compare(password, user.passwordHash);
  if (!passwordMatch) {
    // Common UX issue: clipboard/paste can include surrounding whitespace.
    // Try a second check with trimmed edges without changing canonical behavior.
    const normalized = password.trim();
    if (normalized !== password) {
      passwordMatch = await compare(normalized, user.passwordHash);
    }
  }
  if (!passwordMatch) return null;
  return user;
}
