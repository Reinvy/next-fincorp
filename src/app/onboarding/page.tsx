import { redirect } from "next/navigation";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "@/components/forms/OnboardingForm";

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
    <main className="mx-auto max-w-3xl px-4 py-10">
      <OnboardingForm />
    </main>
  );
}
