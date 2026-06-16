import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";

export function SiteNav() {
  return (
    <header className="glass sticky top-0 z-40 border-b border-edge">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3"
      >
        <div className="flex items-center gap-3 sm:gap-8">
          <Link
            href="/"
            className="font-wordmark text-lg leading-none tracking-tight text-ink sm:text-2xl"
          >
            mediapage
          </Link>
          <Link
            href="/library"
            className="flex min-h-11 items-center text-sm text-ink-muted transition-colors duration-200 hover:text-ink"
          >
            Library
          </Link>
          <Link
            href="/people"
            className="flex min-h-11 items-center text-sm text-ink-muted transition-colors duration-200 hover:text-ink"
          >
            People
          </Link>
        </div>
        <AccountMenu />
      </nav>
    </header>
  );
}
