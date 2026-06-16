"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  buttonClass,
  FieldError,
  inputClass,
  labelClass,
} from "@/components/form-field";
import { validateAvatarFile } from "@/lib/avatar";
import { db } from "@/lib/firebase/client";
import { normalizeHandle, validateHandle } from "@/lib/handles";
import { cropToDataUrl } from "@/lib/image";
import { claimProfile } from "@/lib/profile";

export function OnboardingForm() {
  const { user } = useAuth();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const normalized = normalizeHandle(handle);
  const handleHint =
    handle.length > 0
      ? (() => {
          const v = validateHandle(normalized);
          return v.ok ? null : v.reason;
        })()
      : null;

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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setFormError(null);

    const validation = validateHandle(normalized);
    if (!validation.ok) {
      setFormError(validation.reason);
      return;
    }
    if (!displayName.trim()) {
      setFormError("Pick a display name.");
      return;
    }

    setBusy(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        avatarUrl = await cropToDataUrl(avatarFile);
      }
      await claimProfile(db, user.uid, {
        handle: normalized,
        displayName: displayName.trim(),
        avatarUrl,
      });
      // AuthProvider redirects home once the profile snapshot lands.
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="reveal mx-auto w-full max-w-md border border-edge bg-surface p-8 sm:p-10">
      <p className="font-label text-xs uppercase tracking-[0.3em] text-ink-muted">
        One-time setup
      </p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">
        Claim your page
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <div>
          <label htmlFor="handle" className={labelClass}>
            Handle
          </label>
          <div className="mt-2 flex items-center">
            <span aria-hidden="true" className="border border-r-0 border-edge bg-surface-raised px-3 py-2 min-h-11 flex items-center text-ink-muted">
              @
            </span>
            <input
              id="handle"
              type="text"
              autoComplete="off"
              spellCheck={false}
              required
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className={inputClass}
              aria-describedby="handle-help"
            />
          </div>
          {handleHint ? (
            <FieldError id="handle-help" message={handleHint} />
          ) : (
            <p id="handle-help" className="mt-2 text-xs text-ink-muted">
              Lowercase letters, numbers, and underscores. This is your page
              address.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="display-name" className={labelClass}>
            Display name
          </label>
          <input
            id="display-name"
            type="text"
            autoComplete="name"
            required
            maxLength={50}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={`${inputClass} mt-2`}
          />
        </div>

        <div>
          <label htmlFor="avatar" className={labelClass}>
            Profile picture (optional)
          </label>
          <input
            id="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            className="mt-2 block w-full text-sm text-ink-muted file:mr-4 file:min-h-11 file:cursor-pointer file:border file:border-edge file:bg-bg file:px-4 file:text-ink"
            aria-describedby="avatar-help"
          />
          {avatarError ? (
            <FieldError id="avatar-help" message={avatarError} />
          ) : (
            <p id="avatar-help" className="mt-2 text-xs text-ink-muted">
              JPEG, PNG, or WebP up to 5MB. Cropped to a square.
            </p>
          )}
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
            <img
              src={avatarPreview}
              alt="Preview of your new profile picture"
              className="mt-4 size-16 rounded-full border border-edge object-cover"
            />
          ) : null}
        </div>

        {formError ? (
          <div role="alert">
            <FieldError id="form-error" message={formError} />
          </div>
        ) : null}

        <button type="submit" disabled={busy} className={buttonClass}>
          Finish
        </button>
      </form>
    </div>
  );
}
