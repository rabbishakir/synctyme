import PgBoss from "pg-boss";

let boss: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
  if (boss) return boss;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for pg-boss");
  }

  boss = new PgBoss(connectionString);
  await boss.start();
  return boss;
}

export async function scheduleConsultantDeactivation(
  consultantId: string,
  deactivationDate: Date
): Promise<string> {
  const b = await getBoss();
  const id = await b.send(
    "consultant-deactivation",
    { consultantId },
    { startAfter: deactivationDate }
  );
  return id ?? "";
}
