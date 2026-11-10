"use client";

import { useAuth } from "@/components/auth-provider";
import { SettingsForm } from "@/components/settings-form";

export function SettingsView() {
  const { profile, status } = useAuth();

  if (status !== "ready" || !profile) {
    // Holds the shape of the grouped sections and the danger zone, so
    // the real form lands without moving anything.
    return (
      <div aria-hidden="true" className="flex flex-col gap-14">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10">
          <div className="skeleton h-20 w-full max-w-xs rounded-[10px]" />
          <div className="skeleton h-[34rem] w-full rounded-[24px]" />
        </div>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10">
          <div className="skeleton h-20 w-full max-w-xs rounded-[10px]" />
          <div className="skeleton h-48 w-full rounded-[24px]" />
        </div>
      </div>
    );
  }

  return <SettingsForm key={profile.uid} profile={profile} />;
}
