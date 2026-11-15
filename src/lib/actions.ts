import { ZodError } from "zod";
import { DomainError } from "@/lib/db-errors";
import type { ActionState } from "@/lib/types";

/** Map expected server failures to an ActionState; unexpected ones are logged. */
export function actionError(error: unknown, fallback = "Terjadi kesalahan. Coba lagi."): ActionState {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return {
      status: "error",
      message: "Periksa kembali data yang diisi.",
      fieldErrors,
    };
  }
  if (error instanceof DomainError) {
    return { status: "error", message: error.message };
  }
  console.error("[action]", error);
  return { status: "error", message: fallback };
}

export function success(message: string, redirectTo?: string): ActionState {
  return { status: "success", message, redirectTo };
}
