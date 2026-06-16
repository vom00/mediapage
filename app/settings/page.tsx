import type { Metadata } from "next";
import { SettingsView } from "@/components/settings-view";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
      <p className="reveal font-label text-xs uppercase tracking-[0.3em] text-ink-muted">
        Your page, your rules
      </p>
      <h1 className="reveal mt-3 font-display text-4xl tracking-tight sm:text-5xl">
        Settings
      </h1>
      <div
        className="reveal mt-10"
        style={{ "--reveal-delay": "120ms" } as React.CSSProperties}
      >
        <SettingsView />
      </div>
    </div>
  );
}
