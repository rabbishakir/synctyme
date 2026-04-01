import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "admin@datasyncinc.com";
  const passwordHash = await hash("Admin1234!", 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      platformRole: "SUPER_ADMIN",
      mfaEnabled: false,
    },
    update: {
      passwordHash,
      platformRole: "SUPER_ADMIN",
      mfaEnabled: false,
      mfaSecret: null,
    },
  });

  console.log(`✅ Default Super Admin ready: ${user.email}`);

  const sysAdminEmail = "sysadmin@datasyncinc.com";
  const sysAdmin = await prisma.user.upsert({
    where: { email: sysAdminEmail },
    create: {
      email: sysAdminEmail,
      passwordHash,
      platformRole: "SYSTEM_ADMIN",
      mfaEnabled: false,
    },
    update: {
      passwordHash,
      platformRole: "SYSTEM_ADMIN",
      mfaEnabled: false,
      mfaSecret: null,
    },
  });

  console.log(`✅ Default System Admin ready: ${sysAdmin.email}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
