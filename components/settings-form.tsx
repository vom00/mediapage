"use client";

import { signOut } from "firebase/auth";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import {
  buttonClass,
  FieldError,
  fileInputClass,
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
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLDialogElement>(null);
  const reduceMotion = useReducedMotion();

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
    setDeactivateError(null);
    try {
      await setAccountDeleted(db, profile.uid, true);
    } catch {
      setDeactivateError("Deactivation didn't go through. Try again.");
      return;
    }
    confirmRef.current?.close();
    await signOut(auth);
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-14">
      <form onSubmit={handleSave} className="flex flex-col gap-14" noValidate>
        <SettingsGroup
          title="Profile"
          blurb="How you appear on your page and beside every recommendation you write."
        >
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
              className={`${inputClass} mt-2`}
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
            <div className="mt-2 flex items-stretch">
              <span
                aria-hidden="true"
                className="flex min-h-[46px] items-center rounded-l-[10px] border border-r-0 border-edge bg-surface-raised px-3.5 text-ink-muted"
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
                className={`${inputClass} rounded-l-none!`}
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
                  className="size-14 shrink-0 rounded-full border border-edge object-cover"
                />
              ) : profile.avatarUrl ? (
                <Avatar
                  src={profile.avatarUrl}
                  name={profile.displayName}
                  alt="Your current profile picture"
                  className="size-14 shrink-0 rounded-full border border-edge"
                />
              ) : null}
              <input
                id="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className={fileInputClass}
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
        </SettingsGroup>

        <SettingsGroup
          title="Privacy"
          blurb="Who can see your page, and whether people can comment."
        >
          <div>
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 font-medium text-ink">
              Make my page followers-only
              <input
                type="checkbox"
                checked={followersOnly}
                onChange={(e) => setFollowersOnly(e.target.checked)}
                className="switch"
              />
            </label>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-ink-muted">
              New followers must be approved before they can see your profile
              and shelves. Recommendations you post always stay public.
            </p>
          </div>

          <div className="border-t border-edge pt-5">
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 font-medium text-ink">
              Allow comments on new recommendations by default
              <input
                type="checkbox"
                checked={defaultCommentsOn}
                onChange={(e) => setDefaultCommentsOn(e.target.checked)}
                className="switch"
              />
            </label>
          </div>
        </SettingsGroup>

        <div className="flex flex-col gap-4 border-t border-edge pt-8 sm:flex-row sm:items-center sm:gap-6 md:pl-[calc((100%-2.5rem)/3+2.5rem)]">
          <button
            type="submit"
            disabled={busy}
            className={`${buttonClass} sm:w-auto sm:min-w-52`}
          >
            Save changes
          </button>
          {error ? (
            <div role="alert" className="min-w-0 flex-1">
              <FieldError id="settings-error" message={error} />
            </div>
          ) : null}
          {saved ? (
            <motion.p
              role="status"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex items-center gap-2 text-sm font-medium text-accent"
            >
              <Check aria-hidden="true" className="size-4" />
              Saved.
            </motion.p>
          ) : null}
        </div>
      </form>

      <SettingsGroup
        id="danger-heading"
        title="Danger zone"
      >
        <div>
          <p className="max-w-md text-sm leading-relaxed text-ink-muted">
            Your page disappears from mediapage but nothing is destroyed. Log
            back in any time to reactivate.
          </p>
          <button
            type="button"
            onClick={() => confirmRef.current?.showModal()}
            className={`${ghostButtonClass} btn-danger mt-5`}
          >
            Deactivate account
          </button>
        </div>

        <dialog
          ref={confirmRef}
          aria-labelledby="confirm-heading"
          className="m-auto w-[min(92vw,28rem)] rounded-[24px] border border-edge bg-surface-raised p-7 text-ink backdrop:bg-bg/75 sm:p-8"
        >
          <h3
            id="confirm-heading"
            className="text-2xl font-medium leading-tight"
          >
            Deactivate your account?
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            Your profile, shelves, and recommendations are hidden, not
            deleted. Logging back in lets you reactivate.
          </p>
          {deactivateError ? (
            <p role="alert" className="mt-4 text-sm text-danger">
              {deactivateError}
            </p>
          ) : null}
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => confirmRef.current?.close()}
              className={ghostButtonClass}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDeactivate()}
              className="btn btn-danger"
            >
              Yes, deactivate
            </button>
          </div>
        </dialog>
      </SettingsGroup>
    </div>
  );
}

// One grouped stretch of settings: a short heading column on the left
// (stacked above on phones) and the fields on a card to its right.
function SettingsGroup({
  id,
  title,
  blurb,
  children,
}: {
  id?: string;
  title: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10">
      <div className="md:sticky md:top-24 md:self-start md:pt-2">
        <h2 id={id} className="text-2xl">
          {title}
        </h2>
        {blurb ? (
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
            {blurb}
          </p>
        ) : null}
      </div>
      <div className="card flex min-w-0 flex-col gap-6 p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}
