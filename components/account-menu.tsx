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
    return <div aria-hidden="true" className="h-11 w-24" />;
  }

  if (status === "signedOut" || status === "needsOnboarding") {
    return (
      <Link href="/login" className="btn">
        Log in
      </Link>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
      <NotificationBell />
      {/* The avatar is the profile link, kept on every screen so a
          mobile nav still reaches your page; the @handle text is the
          desktop affordance and collapses on small screens. */}
      <Link
        href={`/u/${profile?.handle}`}
        aria-label={`Your profile, @${profile?.handle}`}
        className="group flex min-h-11 min-w-11 items-center justify-center gap-2.5 rounded-full text-sm text-ink-muted transition-colors duration-200 hover:text-ink sm:pr-3"
      >
        <Avatar
          src={profile?.avatarUrl}
          name={profile?.displayName ?? "?"}
          alt={profile?.displayName ?? ""}
          className="size-8 shrink-0 rounded-full border border-edge bg-surface-raised text-sm transition-colors duration-200 group-hover:border-accent"
        />
        <span className="hidden max-w-32 truncate text-sm sm:block">
          @{profile?.handle}
        </span>
      </Link>
      <button
        type="button"
        onClick={() => void signOut(auth)}
        aria-label="Sign out"
        className="btn btn-quiet min-w-11 px-0! sm:px-4!"
      >
        <LogOut aria-hidden="true" className="size-[18px] sm:hidden" />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}
