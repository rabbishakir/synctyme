import { randomBytes } from "crypto";

export function generateTempPassword(length = 16): string {
  return randomBytes(length).toString("base64").slice(0, length);
}
