import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@datasyncinc.com";
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log("Super Admin already exists, skipping seed.");
    return;
  }

  const passwordHash = await hash("Admin1234!", 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      platformRole: "SUPER_ADMIN",
      mfaEnabled: false,
    },
  });

  console.log(`✅ Super Admin created: ${user.email} (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
