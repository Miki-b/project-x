"use client";

import { useState, type ReactNode } from "react";
import { BrandMark } from "./BrandMark";

export type PortalTab = { id: string; label: string; badge?: number };

/**
 * App-portal shell: a persistent sidebar (desktop) / top bar (mobile) with section nav, and a
 * content area that swaps the active section. Sections are server-rendered and passed in as a
 * map, so data fetching stays on the server while tab switching is instant on the client.
 */
export function PortalShell({
  brand,
  tabs,
  sections,
  headerRight,
}: {
  brand: string;
  tabs: PortalTab[];
  sections: Record<string, ReactNode>;
  headerRight?: ReactNode;
}) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="glass sticky top-0 z-20 hidden h-screen w-60 shrink-0 flex-col border-r border-border p-4 md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-1">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-fg shadow-[var(--shadow-primary)]">
            <BrandMark size={18} />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">{brand}</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {tabs.map((tab) => (
            <NavItem
              key={tab.id}
              tab={tab}
              active={active === tab.id}
              onClick={() => setActive(tab.id)}
            />
          ))}
        </nav>
        {headerRight ? (
          <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
            {headerRight}
          </div>
        ) : null}
      </aside>

      {/* Mobile top bar */}
      <header className="glass sticky top-0 z-20 border-b border-border md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-fg shadow-[var(--shadow-primary)]">
              <BrandMark size={18} />
            </span>
            <span className="font-display text-base font-semibold tracking-tight">{brand}</span>
          </div>
          {headerRight ? <div className="flex items-center gap-2">{headerRight}</div> : null}
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                active === tab.id ? "text-primary-fg" : "text-muted hover:text-fg"
              }`}
              style={active === tab.id ? { background: "var(--primary)" } : undefined}
            >
              {tab.label}
              {typeof tab.badge === "number" ? (
                <span className="ml-1.5 opacity-70">{tab.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>
      </header>

      <main className="min-w-0 flex-1 px-5 py-6 md:px-8 md:py-10">
        <div key={active} className="animate-rise">
          {sections[active ?? ""]}
        </div>
      </main>
    </div>
  );
}

function NavItem({
  tab,
  active,
  onClick,
}: {
  tab: PortalTab;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? "font-semibold" : "text-muted hover:bg-surface-2 hover:text-fg"
      }`}
      style={
        active
          ? {
              background: "color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "var(--primary-2)",
            }
          : undefined
      }
    >
      <span>{tab.label}</span>
      {typeof tab.badge === "number" ? (
        <span className="badge min-w-6 justify-center">{tab.badge}</span>
      ) : null}
    </button>
  );
}
