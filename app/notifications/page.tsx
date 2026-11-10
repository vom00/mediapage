import type { Metadata } from "next";
import { NotificationsView } from "@/components/notifications-view";

export const metadata: Metadata = {
  title: "Notifications",
};

export default function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-20">
      <h1 className="text-4xl font-medium leading-[1.05] tracking-[-0.04em] sm:text-6xl">
        <span className="enter-line">
          <span>Notifications</span>
        </span>
      </h1>
      <div className="enter-up mt-8 max-w-3xl sm:mt-12">
        <NotificationsView />
      </div>
    </div>
  );
}
