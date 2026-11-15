import { redirect } from "next/navigation";
import { getSession } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Daftar" };

export default async function RegisterPage() {
  const session = await getSession();
  if (session?.user) {
    const membership = await prisma.companyMember.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    redirect(membership ? "/dashboard" : "/onboarding");
  }
  return <RegisterForm />;
}
