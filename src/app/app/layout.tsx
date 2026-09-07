import type { ReactNode } from "react";

/**
 * Standalone employee web app (docs/architecture.md §11) — a first-party browser app the
 * employee signs into via the bot deep-link. Full-width: the portal shell (task list),
 * login, and detail pages each manage their own width, so this wrapper must not cap it or
 * the desktop sidebar layout gets squeezed into a narrow column.
 */
export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen w-full">{children}</div>;
}
