import { redirect } from "next/navigation";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "@/components/forms/OnboardingForm";
import { LedgerMark } from "@/components/brand/LedgerMark";

export const dynamic = "force-dynamic";

export const metadata = { title: "Buat Perusahaan" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const membership = await prisma.companyMember.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });
  if (membership) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="mb-8 flex items-center gap-2.5">
        <LedgerMark size={40} className="text-forest" />
        <div>
          <p className="font-display text-xl font-semibold leading-none tracking-tight text-ink">FinCorp</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-ink-faint">Buku Kas</p>
        </div>
      </div>
      <OnboardingForm />
    </main>
  );
}
