import type { Metadata } from "next";
import { NotificationsView } from "@/components/notifications-view";

export const metadata: Metadata = {
  title: "Notifications",
};

export default function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14 sm:py-20">
      <p className="reveal font-label text-xs uppercase tracking-[0.3em] text-ink-muted">
        Who&rsquo;s knocking
      </p>
      <h1 className="reveal mt-3 font-display text-4xl tracking-tight sm:text-5xl">
        Notifications
      </h1>
      <div
        className="reveal mt-10"
        style={{ "--reveal-delay": "120ms" } as React.CSSProperties}
      >
        <NotificationsView />
      </div>
    </div>
  );
}
