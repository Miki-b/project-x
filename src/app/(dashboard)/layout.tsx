import type { ReactNode } from "react";

/**
 * Manager dashboard shell (docs/architecture.md §3). The dashboard is the entire manager
 * experience (docs/product.md §5 principle 3). Auth/session wiring is added during feature work.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-full">{children}</div>;
}
