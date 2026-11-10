import type { Metadata } from "next";
import { SettingsView } from "@/components/settings-view";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="text-5xl leading-[1.05] sm:text-7xl">
        <span className="enter-line">
          <span>Settings</span>
        </span>
      </h1>
      <div
        className="enter-up mt-12 sm:mt-16"
        style={{ "--enter-i": 1 } as React.CSSProperties}
      >
        <SettingsView />
      </div>
    </div>
  );
}
