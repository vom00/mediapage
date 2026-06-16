"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import {
  buttonClass,
  FieldError,
  ghostButtonClass,
  inputClass,
  labelClass,
} from "@/components/form-field";
import { validateAvatarFile } from "@/lib/avatar";
import { auth, db } from "@/lib/firebase/client";
import { normalizeHandle } from "@/lib/handles";
import { cropToDataUrl } from "@/lib/image";
import {
  changeHandle,
  setAccountDeleted,
  updateProfileSettings,
} from "@/lib/settings";
import type { UserProfile } from "@/lib/types";

export function SettingsForm({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [handle, setHandle] = useState(profile.handle);
  const [followersOnly, setFollowersOnly] = useState(!profile.isPublic);
  const [defaultCommentsOn, setDefaultCommentsOn] = useState(
    profile.defaultCommentsOn,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const confirmRef = useRef<HTMLDialogElement>(null);

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setAvatarError(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    setAvatarFile(null);
    if (!file) return;
    const validation = validateAvatarFile(file);
    if (!validation.ok) {
      setAvatarError(validation.reason);
      event.target.value = "";
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    if (!displayName.trim()) {
      setError("Pick a display name.");
      return;
    }
    setBusy(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        avatarUrl = await cropToDataUrl(avatarFile);
      }
      await updateProfileSettings(db, profile.uid, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl,
        isPublic: !followersOnly,
        defaultCommentsOn,
      });
      const nextHandle = normalizeHandle(handle);
      if (nextHandle !== profile.handle) {
        await changeHandle(db, profile.uid, profile.handle, nextHandle);
      }
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate() {
    await setAccountDeleted(db, profile.uid, true);
    confirmRef.current?.close();
    await signOut(auth);
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-12">
      <form onSubmit={handleSave} className="flex max-w-xl flex-col gap-6" noValidate>
        <div>
          <label htmlFor="display-name" className={labelClass}>
            Display name
          </label>
          <input
            id="display-name"
            type="text"
            required
            maxLength={50}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={`${inputClass} mt-2`}
          />
        </div>

        <div>
          <label htmlFor="bio" className={labelClass}>
            Bio
          </label>
          <textarea
            id="bio"
            maxLength={280}
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className={`${inputClass} mt-2 py-3`}
            aria-describedby="bio-help"
          />
          <p id="bio-help" className="mt-2 text-xs text-ink-muted">
            Up to 280 characters.
          </p>
        </div>

        <div>
          <label htmlFor="handle" className={labelClass}>
            Handle
          </label>
          <div className="mt-2 flex items-center">
            <span
              aria-hidden="true"
              className="flex min-h-11 items-center border border-r-0 border-edge bg-surface-raised px-3 text-ink-muted"
            >
              @
            </span>
            <input
              id="handle"
              type="text"
              required
              spellCheck={false}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className={inputClass}
              aria-describedby="handle-help"
            />
          </div>
          <p id="handle-help" className="mt-2 text-xs text-ink-muted">
            Changing your handle breaks links to your old address.
          </p>
        </div>

        <div>
          <label htmlFor="avatar" className={labelClass}>
            Profile picture
          </label>
          <div className="mt-2 flex items-center gap-4">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
              <img
                src={avatarPreview}
                alt="Preview of your new profile picture"
                className="size-14 rounded-full border border-edge object-cover"
              />
            ) : profile.avatarUrl ? (
              <Avatar
                src={profile.avatarUrl}
                name={profile.displayName}
                alt="Your current profile picture"
                className="size-14 rounded-full border border-edge"
              />
            ) : null}
            <input
              id="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="block w-full text-sm text-ink-muted file:mr-4 file:min-h-11 file:cursor-pointer file:border file:border-edge file:bg-bg file:px-4 file:text-ink"
              aria-describedby="avatar-help"
            />
          </div>
          {avatarError ? (
            <FieldError id="avatar-help" message={avatarError} />
          ) : (
            <p id="avatar-help" className="mt-2 text-xs text-ink-muted">
              JPEG, PNG, or WebP up to 5MB. Cropped to a square.
            </p>
          )}
        </div>

        <div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={followersOnly}
              onChange={(e) => setFollowersOnly(e.target.checked)}
              className="size-4 accent-ink"
            />
            Make my page followers-only
          </label>
          <p className="mt-1 text-xs text-ink-muted">
            New followers must be approved before they can see your profile and
            shelves. Recommendations you post always stay public.
          </p>
        </div>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={defaultCommentsOn}
            onChange={(e) => setDefaultCommentsOn(e.target.checked)}
            className="size-4 accent-ink"
          />
          Allow comments on new recommendations by default
        </label>

        {error ? (
          <div role="alert">
            <FieldError id="settings-error" message={error} />
          </div>
        ) : null}
        {saved ? (
          <p role="status" className="border-l-2 border-glow pl-3 text-sm">
            Saved.
          </p>
        ) : null}

        <button type="submit" disabled={busy} className={`${buttonClass} max-w-xs`}>
          Save changes
        </button>
      </form>

      <section
        aria-labelledby="danger-heading"
        className="max-w-xl border-t border-edge pt-8"
      >
        <h2
          id="danger-heading"
          className="font-display text-xl tracking-tight"
        >
          Deactivate
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Your page disappears from mediapage but nothing is destroyed. Log
          back in any time to reactivate.
        </p>
        <button
          type="button"
          onClick={() => confirmRef.current?.showModal()}
          className={`${ghostButtonClass} mt-4`}
        >
          Deactivate account
        </button>

        <dialog
          ref={confirmRef}
          aria-labelledby="confirm-heading"
          className="m-auto w-[min(92vw,28rem)] border border-edge bg-surface-raised p-8 text-ink backdrop:bg-bg/70 backdrop:backdrop-blur-sm"
        >
          <h3 id="confirm-heading" className="font-display text-2xl tracking-tight">
            Deactivate your account?
          </h3>
          <p className="mt-3 text-sm text-ink-muted">
            Your profile, shelves, and recommendations are hidden, not
            deleted. Logging back in lets you reactivate.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => void handleDeactivate()}
              className={buttonClass}
            >
              Yes, deactivate
            </button>
            <button
              type="button"
              onClick={() => confirmRef.current?.close()}
              className={ghostButtonClass}
            >
              Cancel
            </button>
          </div>
        </dialog>
      </section>
    </div>
  );
}
