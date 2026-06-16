"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { useState } from "react";
import {
  buttonClass,
  FieldError,
  ghostButtonClass,
  inputClass,
  labelClass,
} from "@/components/form-field";
import { authErrorMessage } from "@/lib/auth-errors";
import { auth } from "@/lib/firebase/client";

type Mode = "login" | "signup";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // AuthProvider redirects: onboarding for new accounts, home
      // for returning users.
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }

  return (
    <div className="reveal mx-auto w-full max-w-md border border-edge bg-surface p-8 sm:p-10">
      <h1 className="font-display text-3xl tracking-tight">
        {mode === "login" ? "Log in" : "Create your page"}
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        {mode === "login"
          ? "Welcome back to your shelves."
          : "Six shelves are waiting for your five favorites each."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputClass} mt-2`}
          />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} mt-2`}
            aria-describedby={mode === "signup" ? "password-help" : undefined}
          />
          {mode === "signup" ? (
            <p id="password-help" className="mt-2 text-xs text-ink-muted">
              At least 6 characters.
            </p>
          ) : null}
        </div>

        {error ? (
          <div role="alert">
            <FieldError id="auth-error" message={error} />
          </div>
        ) : null}

        <button type="submit" disabled={busy} className={buttonClass}>
          {mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-3">
        <button type="button" onClick={handleGoogle} className={ghostButtonClass}>
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
          className={ghostButtonClass}
        >
          {mode === "login" ? "Create account" : "Log in instead"}
        </button>
      </div>
    </div>
  );
}
