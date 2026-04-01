import { prisma } from "@/lib/db";
import { getBoss } from "./index";

export async function registerJobHandlers(): Promise<void> {
  const boss = await getBoss();

  await boss.work(
    "consultant-deactivation",
    async (job: { data: { consultantId: string } }) => {
      const { consultantId } = job.data;

      await prisma.consultant.update({
        where: { id: consultantId },
        data: { status: "INACTIVE" },
      });

      await prisma.employmentCycle.updateMany({
        where: { consultantId, closedAt: null },
        data: { closedAt: new Date() },
      });
    }
  );
}
