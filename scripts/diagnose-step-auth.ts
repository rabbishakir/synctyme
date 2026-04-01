/**
 * Run (loads env before Prisma):
 *   node --env-file=.env.local --env-file=.env ./node_modules/tsx/dist/cli.mjs scripts/diagnose-step-auth.ts
 *
 * Or: npx dotenv -e .env.local -e .env -- npx tsx scripts/diagnose-step-auth.ts
 */
import { prisma } from "../src/lib/db/index";
import { verifyUserPassword } from "../src/lib/auth/credentials";
import { verifyStepUpAuth } from "../src/lib/auth/step-up";

async function main() {
  const users = await prisma.user.findMany({
    where: { platformRole: { not: null } },
    select: {
      id: true,
      email: true,
      platformRole: true,
      mfaEnabled: true,
      mfaSecret: true,
      passwordHash: true,
    },
  });

  console.log("Platform users:", users.length);
  for (const u of users) {
    const hashLen = u.passwordHash?.length ?? 0;
    console.log(
      `- id=${u.id} email=${u.email} role=${u.platformRole} mfa=${u.mfaEnabled} hashLen=${hashLen} (bcrypt expects 60)`
    );
    if (hashLen !== 60 && hashLen > 0) {
      console.warn("  WARNING: hash length is not 60; bcryptjs compare may always return false.");
    }
  }

  const seedEmail = "admin@datasyncinc.com";
  const seedPassword = "Admin1234!";

  const v = await verifyUserPassword(seedEmail, seedPassword);
  console.log(
    `\nverifyUserPassword("${seedEmail}", "<seed password>"):`,
    v ? `OK userId=${v.id}` : "FAILED (wrong password or user missing)"
  );

  if (v) {
    const step = await verifyStepUpAuth(v.id, {
      reauthPassword: seedPassword,
    });
    console.log(`verifyStepUpAuth(userId, { reauthPassword }) (MFA off path):`, step);

    const stepWrong = await verifyStepUpAuth(v.id, {
      reauthPassword: "wrong-password",
    });
    console.log("verifyStepUpAuth with wrong password:", stepWrong);

    const wrongId = "wrong-id-on-purpose";
    const stepFallback = await verifyStepUpAuth(
      wrongId,
      { reauthPassword: seedPassword },
      v.email
    );
    console.log(
      `verifyStepUpAuth(wrong userId + session email fallback):`,
      stepFallback
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
