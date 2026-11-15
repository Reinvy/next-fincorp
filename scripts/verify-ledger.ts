import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { verifyLedger } from "@/server/demo/verify";

async function main(): Promise<void> {
  const company = await prisma.company.findUnique({ where: { slug: "pt-fincorp-nusantara" }, select: { id: true } });
  if (!company) throw new Error("Perusahaan demo pt-fincorp-nusantara tidak ditemukan. Jalankan npm run db:seed.");
  await verifyLedger(company.id);
  console.log("VERIFY OK — jurnal seimbang, neraca seimbang, saldo kas tidak negatif.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
