/**
 * Structured logging (docs/architecture.md §12). Attach `orgId` and `jobId` where
 * available. Never log message content or personal data.
 */

type LogValue = string | number | boolean | null | undefined;
export type LogFields = Record<string, LogValue>;
type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, message: string, fields?: LogFields): void {
  const line = JSON.stringify({ level, message, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, fields?: LogFields) => emit("debug", message, fields),
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields),
};
