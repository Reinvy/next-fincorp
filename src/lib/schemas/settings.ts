import { z } from "zod";
import { optionalText, requiredText } from "@/lib/schemas/common";

export const teamInviteSchema = z.object({
  name: requiredText(120, "Nama"),
  email: requiredText(160, "Email").pipe(z.string().email("Format email tidak valid")),
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(128),
  role: z.enum(["ADMIN", "ACCOUNTANT", "VIEWER"]),
});

export const teamRoleSchema = z.object({
  membershipId: requiredText(64, "Anggota"),
  role: z.enum(["ADMIN", "ACCOUNTANT", "VIEWER"]),
});

export const teamRemoveSchema = z.object({
  membershipId: requiredText(64, "Anggota"),
});

export const profileSchema = z.object({
  name: requiredText(120, "Nama"),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Kata sandi saat ini wajib diisi"),
    newPassword: z.string().min(8, "Kata sandi baru minimal 8 karakter").max(128),
    confirmPassword: z.string().min(8, "Konfirmasi kata sandi minimal 8 karakter"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak sama",
    path: ["confirmPassword"],
  });

export const companySettingsSchema = z.object({
  name: requiredText(120, "Nama perusahaan"),
  npwp: optionalText(30),
  nib: optionalText(30),
  pkpNumber: optionalText(40),
  kpp: optionalText(80),
  address: optionalText(240),
  city: optionalText(80),
  province: optionalText(80),
  postalCode: optionalText(10),
  email: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : value),
    z.string().trim().email("Format email tidak valid").max(160).optional(),
  ),
  phone: optionalText(30),
  isPkp: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
  ppnRate: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Tarif PPN tidak valid"),
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12),
});
