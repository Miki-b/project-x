"use client";

import { useState, type ReactNode } from "react";
import { MadeByApexHub } from "./MadeByApexHub";

export type PortalTab = { id: string; label: string; badge?: number };

export type PortalBranding = {
  logoVersion: string | null; // light-mode logo cache-bust hash; null = none
  logoDarkVersion: string | null; // dark-mode logo cache-bust hash; null = none
  primaryLight: string | null;
  primaryDark: string | null;
  font: "default" | "space" | "manrope" | "sora";
};

/** Build the CSS-variable overrides for an org's theme (colours + font). Values are pre-validated. */
function brandingCss(b?: PortalBranding): string {
  if (!b) return "";
  const parts: string[] = [];
  if (b.primaryLight) parts.push(`:root{--primary:${b.primaryLight};--primary-2:${b.primaryLight}}`);
  if (b.primaryDark) parts.push(`.dark{--primary:${b.primaryDark};--primary-2:${b.primaryDark}}`);
  if (b.font !== "default") {
    parts.push(`:root{--font-display:var(--font-${b.font});--font-sans:var(--font-${b.font})}`);
  }
  return parts.join("");
}

function BrandArea({
  brand,
  logoVersion,
  logoDarkVersion,
}: {
  brand: string;
  logoVersion: string | null;
  logoDarkVersion: string | null;
}) {
  const cls = "h-8 w-auto max-w-[150px] object-contain";

  // Org logo (white-label) takes precedence; falls back across themes if only one variant is set.
  if (logoVersion || logoDarkVersion) {
    const lightSrc = logoVersion
      ? `/api/org/logo?v=${logoVersion}`
      : `/api/org/logo?variant=dark&v=${logoDarkVersion}`;
    const darkSrc = logoDarkVersion
      ? `/api/org/logo?variant=dark&v=${logoDarkVersion}`
      : `/api/org/logo?v=${logoVersion}`;
    if (lightSrc === darkSrc) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={lightSrc} alt={brand} className={cls} />;
    }
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lightSrc} alt={brand} className={`${cls} dark:hidden`} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={darkSrc} alt={brand} className={`hidden ${cls} dark:block`} />
      </>
    );
  }

  // Default product brand: Soso.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/Soso_logo.png" alt={brand} className={cls} />;
}

/**
 * App-portal shell. Desktop/tablet (md+): a full-height sidebar pinned to the left edge with
 * section nav, content filling the rest of the viewport. Phones (<md): a glass top bar + a
 * horizontal tab strip. Sections are server-rendered and passed in as a map, so data fetching
 * stays on the server while tab switching is instant on the client.
 */
export function PortalShell({
  brand,
  tabs,
  sections,
  headerRight,
  branding,
}: {
  brand: string;
  tabs: PortalTab[];
  sections: Record<string, ReactNode>;
  headerRight?: ReactNode;
  branding?: PortalBranding;
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  const css = brandingCss(branding);

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
      {/* Sidebar (tablet + desktop) — pinned to the left edge, fills viewport height */}
      <aside className="glass sticky top-0 z-20 hidden h-screen w-60 shrink-0 flex-col border-r border-border p-4 md:flex lg:w-64">
        <div className="mb-6 flex items-center px-1">
          <BrandArea
            brand={brand}
            logoVersion={branding?.logoVersion ?? null}
            logoDarkVersion={branding?.logoDarkVersion ?? null}
          />
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
        <div className="mt-4 border-t border-border pt-4">
          <MadeByApexHub />
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="glass sticky top-0 z-20 border-b border-border md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <BrandArea
            brand={brand}
            logoVersion={branding?.logoVersion ?? null}
            logoDarkVersion={branding?.logoDarkVersion ?? null}
          />
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

      {/* Fluid content — fills the space beside the sidebar, capped for readability */}
      <main className="min-w-0 flex-1">
        {/* Desktop top-right controls (profile avatar, language, theme, sign out) */}
        {headerRight ? (
          <div className="glass sticky top-0 z-10 hidden items-center justify-end gap-2 border-b border-border px-6 py-2.5 md:flex">
            {headerRight}
          </div>
        ) : null}
        <div className="px-4 py-6 sm:px-6 md:px-8 lg:px-10 lg:py-8">
          <div key={active} className="animate-rise mx-auto w-full max-w-6xl">
            {sections[active ?? ""]}
          </div>
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
