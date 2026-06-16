import type { Metadata } from "next";
import { LibraryBackdrop } from "@/components/library-backdrop";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-[calc(100svh-3.6rem)] items-center overflow-hidden">
      <LibraryBackdrop />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20">
        <LoginForm />
      </div>
    </div>
  );
}
