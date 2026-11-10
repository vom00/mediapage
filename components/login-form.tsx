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

// Position in the one first-screen entrance (see .enter-up).
const step = (i: number) => ({ "--enter-i": i }) as React.CSSProperties;

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
    <div className="card mx-auto w-full max-w-md p-7 sm:p-10">
      <h1 className="text-4xl leading-[1.05] sm:text-5xl">
        <span className="enter-line">
          <span>{mode === "login" ? "Log in" : "Create your page"}</span>
        </span>
      </h1>
      <p className="enter-up mt-4 text-base text-ink-muted" style={step(1)}>
        {mode === "login"
          ? "Welcome back to your shelves."
          : "Five shelves are waiting for your five favorites each."}
      </p>

      <form
        onSubmit={handleSubmit}
        className="enter-up mt-8 flex flex-col gap-5"
        style={step(2)}
        noValidate
      >
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

        <button type="submit" disabled={busy} className={`${buttonClass} mt-1`}>
          {mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>

      <div
        aria-hidden="true"
        className="enter-up my-6 flex items-center gap-4 text-sm text-ink-muted"
        style={step(3)}
      >
        <span className="h-px flex-1 bg-edge" />
        or
        <span className="h-px flex-1 bg-edge" />
      </div>

      <div className="enter-up flex flex-col gap-3" style={step(3)}>
        <button type="button" onClick={handleGoogle} className={ghostButtonClass}>
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
          className={`${ghostButtonClass} btn-quiet`}
        >
          {mode === "login" ? "Create account" : "Log in instead"}
        </button>
      </div>
    </div>
  );
}
