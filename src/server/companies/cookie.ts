import { cookies } from "next/headers";
import { COMPANY_COOKIE } from "@/lib/constants";

export async function setActiveCompanyCookie(companyId: string): Promise<void> {
  const store = await cookies();
  store.set(COMPANY_COOKIE, companyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  });
}
