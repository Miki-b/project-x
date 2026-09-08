"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import type { Locale } from "@/types";
import { t } from "@/lib/i18n";
import { updateBrandingAction, setLogoAction, removeLogoAction } from "./settings-actions";
import type { SettingsState } from "./types";

const INITIAL: SettingsState = {};
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/svg+xml";
const FONTS = ["default", "space", "manrope", "sora"] as const;

type Variant = "light" | "dark";

type BrandingProps = {
  logoVersion: string | null;
  logoDarkVersion: string | null;
  primaryLight: string | null;
  primaryDark: string | null;
  font: string;
};

export function BrandingSettings({
  orgId,
  locale,
  branding,
}: {
  orgId: string;
  locale: Locale;
  branding: BrandingProps;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateBrandingAction, INITIAL);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <LogoSlot
          orgId={orgId}
          locale={locale}
          variant="light"
          version={branding.logoVersion}
          router={router}
        />
        <LogoSlot
          orgId={orgId}
          locale={locale}
          variant="dark"
          version={branding.logoDarkVersion}
          router={router}
        />
      </div>

      <form action={action} className="flex flex-col gap-4 border-t border-border pt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="field-label">{t(locale, "settings.primary_light")}</span>
            <input
              name="primaryLight"
              type="color"
              defaultValue={branding.primaryLight ?? "#1b2a5c"}
              className="input h-11 cursor-pointer p-1"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="field-label">{t(locale, "settings.primary_dark")}</span>
            <input
              name="primaryDark"
              type="color"
              defaultValue={branding.primaryDark ?? "#8b5cf6"}
              className="input h-11 cursor-pointer p-1"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="field-label">{t(locale, "settings.font")}</span>
          <select name="font" defaultValue={branding.font} className="input">
            {FONTS.map((f) => (
              <option key={f} value={f}>
                {t(locale, `settings.font_${f}` as `settings.font_${(typeof FONTS)[number]}`)}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted">{t(locale, "settings.hint")}</p>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="btn btn-primary self-start">
            {t(locale, "settings.save")}
          </button>
          {state.ok ? (
            <span className="text-sm text-emerald-600">{t(locale, "settings.saved")}</span>
          ) : null}
          {state.error ? <span className="text-sm text-red-500">{state.error}</span> : null}
        </div>
      </form>
    </div>
  );
}

function LogoSlot({
  orgId,
  locale,
  variant,
  version,
  router,
}: {
  orgId: string;
  locale: Locale;
  variant: Variant;
  version: string | null;
  router: ReturnType<typeof useRouter>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const src = `/api/org/logo?${variant === "dark" ? "variant=dark&" : ""}v=${version}`;
  // A dark-mode logo previews on a dark surface, a light one on a light surface.
  const previewBg = variant === "dark" ? "bg-zinc-900" : "bg-white";

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) {
      setError(t(locale, "profile.photo_too_large"));
      return;
    }
    setBusy(true);
    try {
      const blob = await upload(`logos/${orgId}/${variant}/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ kind: "logo", id: orgId }),
        contentType: file.type || undefined,
      });
      const res = await setLogoAction({ url: blob.url, pathname: blob.pathname, variant });
      if (!res.ok) setError(t(locale, "files.failed"));
      else router.refresh();
    } catch {
      setError(t(locale, "files.failed"));
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        await removeLogoAction(variant);
        router.refresh();
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <div>
      <span className="field-label">
        {t(locale, variant === "dark" ? "settings.logo_dark" : "settings.logo_light")}
      </span>
      <div
        className={`mt-2 flex h-16 items-center justify-center rounded-lg border border-border ${previewBg}`}
      >
        {version ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="max-h-12 w-auto max-w-[80%] object-contain" />
        ) : (
          <span className="text-xs text-zinc-400">{t(locale, "settings.no_logo")}</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <label
          className={`btn btn-soft ${busy ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
        >
          {busy ? t(locale, "files.uploading") : t(locale, "settings.upload_logo")}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={onPick}
            disabled={busy}
          />
        </label>
        {version ? (
          <button type="button" onClick={remove} disabled={busy} className="btn btn-ghost">
            {t(locale, "profile.remove_photo")}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
