import type { ReactNode } from "react";

/**
 * Standalone employee web app shell (docs/architecture.md §11). Unlike /miniapp (embedded in
 * Telegram), this is a first-party browser app an employee signs into with the Telegram Login
 * Widget. Mobile-first but comfortable on desktop.
 */
export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-h-screen w-full max-w-md sm:max-w-lg">{children}</div>;
}
