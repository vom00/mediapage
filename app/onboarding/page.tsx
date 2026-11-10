import type { Metadata } from "next";
import { LibraryBackdrop } from "@/components/library-backdrop";
import { OnboardingForm } from "@/components/onboarding-form";

export const metadata: Metadata = {
  title: "Claim your page",
};

export default function OnboardingPage() {
  return (
    <div className="auth-stage relative flex items-center overflow-hidden">
      <LibraryBackdrop />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <OnboardingForm />
      </div>
    </div>
  );
}
