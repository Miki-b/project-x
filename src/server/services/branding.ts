import { del } from "@vercel/blob";
import type { Ctx } from "@/types";
import { NotAuthorised } from "@/types";
// Organization is the root table (no orgId column), so branding reads/writes go through
// basePrisma by PK — a documented infrastructure exception (docs/architecture.md §5).
import { basePrisma } from "@/server/db/client";

/**
 * Org branding service (docs/architecture.md §4.14). Managers set a logo, light/dark primary
 * colours, and a font preset; both portals read this to theme themselves. Colours are validated
 * as hex; the font is constrained to a known preset.
 */

export const FONT_PRESETS = ["default", "space", "manrope", "sora"] as const;
export type FontPreset = (typeof FONT_PRESETS)[number];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const BLOB_URL_RE = /^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//;

function isManager(ctx: Ctx): boolean {
  return ctx.role === "OWNER" || ctx.role === "MANAGER";
}

function normFont(v: string | null | undefined): FontPreset {
  return (FONT_PRESETS as readonly string[]).includes(v ?? "") ? (v as FontPreset) : "default";
}

function normHex(v: string): string | null {
  const t = v.trim();
  return HEX_RE.test(t) ? t.toLowerCase() : null;
}

export type Branding = {
  name: string;
  logoPathname: string | null;
  primaryLight: string | null;
  primaryDark: string | null;
  font: FontPreset;
};

/** Read an org's branding for theming the shell. */
export async function getBranding(orgId: string): Promise<Branding | null> {
  const org = await basePrisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return null;
  return {
    name: org.name,
    logoPathname: org.logoPathname,
    primaryLight: org.brandPrimaryLight,
    primaryDark: org.brandPrimaryDark,
    font: normFont(org.brandFont),
  };
}

/** Update colours + font (manager-only). Invalid hex clears that colour; unknown font → default. */
export async function updateBranding(
  ctx: Ctx,
  input: { primaryLight?: string; primaryDark?: string; font?: string },
): Promise<void> {
  if (!isManager(ctx)) throw new NotAuthorised();
  const data: { brandPrimaryLight?: string | null; brandPrimaryDark?: string | null; brandFont?: string } = {};
  if (input.primaryLight !== undefined) data.brandPrimaryLight = normHex(input.primaryLight);
  if (input.primaryDark !== undefined) data.brandPrimaryDark = normHex(input.primaryDark);
  if (input.font !== undefined) data.brandFont = normFont(input.font);
  await basePrisma.organization.update({ where: { id: ctx.orgId }, data });
}

/** Set the org logo after a blob upload (manager-only); deletes the previous object. */
export async function setLogo(ctx: Ctx, logo: { url: string; pathname: string }): Promise<void> {
  if (!isManager(ctx)) throw new NotAuthorised();
  if (!BLOB_URL_RE.test(logo.url)) throw new NotAuthorised("Invalid logo URL");
  const org = await basePrisma.organization.findUnique({ where: { id: ctx.orgId } });
  await basePrisma.organization.update({
    where: { id: ctx.orgId },
    data: { logoUrl: logo.url, logoPathname: logo.pathname },
  });
  if (org?.logoUrl && org.logoUrl !== logo.url) {
    try {
      await del(org.logoUrl);
    } catch {
      /* ignore */
    }
  }
}

/** Remove the org logo (manager-only). */
export async function removeLogo(ctx: Ctx): Promise<void> {
  if (!isManager(ctx)) throw new NotAuthorised();
  const org = await basePrisma.organization.findUnique({ where: { id: ctx.orgId } });
  await basePrisma.organization.update({
    where: { id: ctx.orgId },
    data: { logoUrl: null, logoPathname: null },
  });
  if (org?.logoUrl) {
    try {
      await del(org.logoUrl);
    } catch {
      /* ignore */
    }
  }
}
