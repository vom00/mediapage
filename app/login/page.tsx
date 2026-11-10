import type { Metadata } from "next";
import { LibraryBackdrop } from "@/components/library-backdrop";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <div className="auth-stage relative flex items-center overflow-hidden">
      <LibraryBackdrop />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <LoginForm />
      </div>
    </div>
  );
}
