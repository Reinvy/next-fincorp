import { redirect } from "next/navigation";
import { getSession } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Masuk" };

export default async function LoginPage() {
  const session = await getSession();
  if (session?.user) {
    const membership = await prisma.companyMember.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    redirect(membership ? "/dashboard" : "/onboarding");
  }
  return <LoginForm />;
}
