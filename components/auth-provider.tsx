"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import type { UserProfile } from "@/lib/types";

export type AuthStatus = "loading" | "signedOut" | "needsOnboarding" | "ready";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  status: AuthStatus;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  status: "loading",
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

// Routes that require a signed-in user.
const PROTECTED = [/^\/onboarding/, /^\/settings/, /^\/notifications/];

function AuthRedirects({ status }: { status: AuthStatus }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "signedOut" && PROTECTED.some((r) => r.test(pathname))) {
      router.replace("/login");
    } else if (status === "needsOnboarding" && pathname !== "/onboarding") {
      // First login forces the one-time onboarding.
      router.replace("/onboarding");
    } else if (
      status === "ready" &&
      (pathname === "/login" || pathname === "/onboarding")
    ) {
      router.replace("/");
    }
  }, [status, pathname, router]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthResolved(true);
      if (!nextUser) {
        setProfile(null);
        setProfileResolved(true);
      } else {
        setProfileResolved(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
      setProfileResolved(true);
    });
  }, [user]);

  const status: AuthStatus = !authResolved
    ? "loading"
    : !user
      ? "signedOut"
      : !profileResolved
        ? "loading"
        : profile
          ? "ready"
          : "needsOnboarding";

  return (
    <AuthContext.Provider value={{ user, profile, status }}>
      <AuthRedirects status={status} />
      {children}
    </AuthContext.Provider>
  );
}
