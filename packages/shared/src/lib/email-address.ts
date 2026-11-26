import { z } from "zod";

/** A deliverable mailbox needs a dotted domain. `user@localhost` and `a@b` are rejected. */
export const STRICT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isStrictEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 254) return false;
  return STRICT_EMAIL_PATTERN.test(trimmed);
}

export const strictEmailSchema = z
  .string()
  .trim()
  .max(254)
  .refine(isStrictEmail, { message: "Enter a valid email address." });
