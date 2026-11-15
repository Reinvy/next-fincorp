import { redirect } from "next/navigation";
import { getActorContext } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const context = await getActorContext();
  if (!context) redirect("/login");
  if (!context.actor) redirect("/onboarding");
  redirect("/dashboard");
}
