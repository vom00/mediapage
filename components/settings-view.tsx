"use client";

import { useAuth } from "@/components/auth-provider";
import { SettingsForm } from "@/components/settings-form";

export function SettingsView() {
  const { profile, status } = useAuth();

  if (status !== "ready" || !profile) {
    return (
      <div aria-hidden="true" className="flex max-w-xl flex-col gap-4">
        <div className="skeleton h-11 w-full" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-11 w-full" />
      </div>
    );
  }

  return <SettingsForm key={profile.uid} profile={profile} />;
}
