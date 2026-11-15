import { Prisma } from "@/generated/prisma/client";

export type DomainErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_STATUS"
  | "INVALID_INPUT"
  | "PERIOD_CLOSED"
  | "INSUFFICIENT_FUNDS"
  | "NEGATIVE_CASH"
  | "DUPLICATE"
  | "CONFLICT";

/** Expected business-rule failure. Actions map these to Indonesian messages. */
export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

export function isKnownRequestError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

export function isUniqueViolation(error: unknown): boolean {
  return isKnownRequestError(error, "P2002");
}

export function isNotFoundError(error: unknown): boolean {
  return isKnownRequestError(error, "P2025");
}

export function isSerializationFailure(error: unknown): boolean {
  return isKnownRequestError(error, "P2034");
}

/** Convert a unique-constraint crash into a domain duplicate instead of a 500. */
export function asDuplicate(error: unknown, message: string): never {
  if (isUniqueViolation(error)) throw new DomainError("DUPLICATE", message);
  throw error;
}
