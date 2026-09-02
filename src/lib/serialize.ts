/**
 * BigInt does not survive `JSON.stringify` (docs/architecture.md §12). Telegram IDs
 * (`telegramUserId`, `telegramChatId`) are stored as BigInt. Convert BigInt to string
 * at every API / transport boundary using these helpers — never let a raw BigInt reach
 * a Response body, a webhook payload, or a React server-component prop.
 */

/** Recursively maps BigInt -> string and Date -> string, matching JSON.stringify output. */
export type JsonSafe<T> = T extends bigint
  ? string
  : T extends Date
    ? string
    : T extends (infer U)[]
      ? JsonSafe<U>[]
      : T extends object
        ? { [K in keyof T]: JsonSafe<T[K]> }
        : T;

/** JSON.stringify replacer that renders BigInt as a decimal string. */
export function bigIntReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

/**
 * Produce a structurally identical value with all BigInt (and Date) values converted
 * to strings, safe to `JSON.stringify` or hand to the client.
 */
export function toJsonSafe<T>(value: T): JsonSafe<T> {
  return JSON.parse(JSON.stringify(value, bigIntReplacer)) as JsonSafe<T>;
}
