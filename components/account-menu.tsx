"use client";

import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { useAuth } from "@/components/auth-provider";
import { NotificationBell } from "@/components/notification-bell";
import { auth } from "@/lib/firebase/client";

export function AccountMenu() {
  const { profile, status } = useAuth();

  if (status === "loading") {
    return <div aria-hidden="true" className="h-11 w-20" />;
  }

  if (status === "signedOut" || status === "needsOnboarding") {
    return (
      <Link
        href="/login"
        className="flex min-h-11 items-center border border-edge px-4 text-sm text-ink transition-colors duration-200 hover:border-glow"
      >
        Log in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <NotificationBell />
      {/* The avatar is the profile link, kept on every screen so a
          mobile nav still reaches your page; the @handle text is the
          desktop affordance and collapses on small screens. */}
      <Link
        href={`/u/${profile?.handle}`}
        aria-label={`Your profile, @${profile?.handle}`}
        className="flex items-center gap-2 text-sm text-ink-muted transition-colors duration-200 hover:text-ink"
      >
        <Avatar
          src={profile?.avatarUrl}
          name={profile?.displayName ?? "?"}
          alt={profile?.displayName ?? ""}
          className="size-8 shrink-0 rounded-full border border-edge bg-surface text-sm"
        />
        <span className="hidden max-w-32 truncate font-label sm:block">
          @{profile?.handle}
        </span>
      </Link>
      <button
        type="button"
        onClick={() => void signOut(auth)}
        aria-label="Sign out"
        className="flex min-h-11 min-w-11 items-center justify-center border border-edge text-sm text-ink transition-colors duration-200 hover:border-glow sm:px-4"
      >
        <LogOut aria-hidden="true" className="size-4 sm:hidden" />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}
