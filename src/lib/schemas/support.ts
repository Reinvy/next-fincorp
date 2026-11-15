import { z } from "zod";
import { requiredText } from "@/lib/schemas/common";

export const ticketSchema = z.object({
  subject: requiredText(160, "Subjek"),
  category: z.enum(["ACCOUNTING", "TAX", "TECHNICAL", "BILLING", "OTHER"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  description: requiredText(2000, "Deskripsi"),
});

export const ticketReplySchema = z.object({
  ticketId: requiredText(64, "Tiket"),
  body: requiredText(2000, "Pesan"),
});

export const ticketStatusSchema = z.object({
  ticketId: requiredText(64, "Tiket"),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});
