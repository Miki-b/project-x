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

type BrandingProps = {
  hasLogo: boolean;
  logoVersion: string | null;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
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
      const blob = await upload(`logos/${orgId}/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ kind: "logo", id: orgId }),
        contentType: file.type || undefined,
      });
      const res = await setLogoAction({ url: blob.url, pathname: blob.pathname });
      if (!res.ok) setError(t(locale, "files.failed"));
      else router.refresh();
    } catch {
      setError(t(locale, "files.failed"));
    } finally {
      setBusy(false);
    }
  }

  function removeLogo() {
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        await removeLogoAction();
        router.refresh();
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="field-label">{t(locale, "settings.logo")}</span>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {branding.hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/org/logo?v=${branding.logoVersion}`}
              alt=""
              className="h-10 w-auto max-w-[160px] rounded-md object-contain ring-1 ring-border"
            />
          ) : (
            <span className="text-sm text-muted">{t(locale, "settings.no_logo")}</span>
          )}
          <label
            className={`btn btn-soft ${busy ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
          >
            {busy ? t(locale, "files.uploading") : t(locale, "settings.upload_logo")}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={onLogo}
              disabled={busy}
            />
          </label>
          {branding.hasLogo ? (
            <button type="button" onClick={removeLogo} disabled={busy} className="btn btn-ghost">
              {t(locale, "profile.remove_photo")}
            </button>
          ) : null}
        </div>
        {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
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
