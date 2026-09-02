import type { Role } from "@/generated/prisma/client";

/** Supported user locales (docs/product.md §8). */
export type Locale = "en" | "am";

/**
 * Actor context threaded through every service call (docs/architecture.md §7).
 * `orgId` comes from the session only — never from a request parameter or body.
 */
export type Ctx = {
  orgId: string;
  actorId: string;
  role: Role;
  locale: Locale;
};

export * from "./errors";
