"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import type { Locale } from "@/types";
import { t } from "@/lib/i18n";
import {
  updateProfileAction,
  setAvatarAction,
  removeAvatarAction,
  type ProfileState,
} from "@/app/profile-actions";
import { Avatar } from "./Avatar";

const INITIAL: ProfileState = {};
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/gif,image/webp";

type EditableUser = {
  id: string;
  name: string;
  phone: string | null;
  role: "OWNER" | "MANAGER" | "MEMBER";
  avatarPathname: string | null;
};

export function ProfileEditor({ user, locale }: { user: EditableUser; locale: Locale }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateProfileAction, INITIAL);

  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setPhotoError(null);
    if (file.size > MAX_AVATAR_BYTES) {
      setPhotoError(t(locale, "profile.photo_too_large"));
      return;
    }
    setBusy(true);
    try {
      const blob = await upload(`avatars/${user.id}/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ kind: "avatar", id: user.id }),
        contentType: file.type || undefined,
      });
      const res = await setAvatarAction({ url: blob.url, pathname: blob.pathname });
      if (!res.ok) setPhotoError(t(locale, "files.failed"));
      else router.refresh();
    } catch {
      setPhotoError(t(locale, "files.failed"));
    } finally {
      setBusy(false);
    }
  }

  function removePhoto() {
    setBusy(true);
    setPhotoError(null);
    void (async () => {
      try {
        await removeAvatarAction();
        router.refresh();
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Photo */}
      <div className="flex items-center gap-4">
        <Avatar user={user} size={72} />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <label
              className={`btn btn-soft ${busy ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
            >
              {busy ? t(locale, "files.uploading") : t(locale, "profile.change_photo")}
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={onPick}
                disabled={busy}
              />
            </label>
            {user.avatarPathname ? (
              <button
                type="button"
                onClick={removePhoto}
                disabled={busy}
                className="btn btn-ghost"
              >
                {t(locale, "profile.remove_photo")}
              </button>
            ) : null}
          </div>
          <p className="text-xs text-muted">{t(locale, "profile.photo_hint")}</p>
          {photoError ? <p className="text-sm text-red-500">{photoError}</p> : null}
        </div>
      </div>

      {/* Details */}
      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="field-label">{t(locale, "profile.name")}</span>
          <input name="name" type="text" required defaultValue={user.name} className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="field-label">{t(locale, "profile.phone")}</span>
          <input name="phone" type="tel" defaultValue={user.phone ?? ""} className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="field-label">{t(locale, "profile.role")}</span>
          <input value={t(locale, `role.${user.role}`)} readOnly disabled className="input opacity-70" />
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="btn btn-primary self-start">
            {t(locale, "profile.save")}
          </button>
          {state.ok ? <span className="text-sm text-emerald-600">{t(locale, "profile.saved")}</span> : null}
          {state.error ? <span className="text-sm text-red-500">{state.error}</span> : null}
        </div>
      </form>
    </div>
  );
}
