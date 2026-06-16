"use client";

import { useAuth } from "@/components/auth-provider";
import { DeactivatedNotice } from "@/components/deactivated-notice";
import { HomeFeed } from "@/components/home-feed";
import { Landing } from "@/components/landing";

// Signed-in users get their feed; everyone else gets the landing
// page. While auth resolves we render the landing (it is also the
// correct signed-out answer, so there is no flash for visitors).
// Soft-deleted accounts get the reactivation notice instead.
export function HomeView() {
  const { status, profile } = useAuth();
  if (status === "ready" && profile?.deleted) return <DeactivatedNotice />;
  if (status === "ready") return <HomeFeed />;
  return <Landing />;
}
