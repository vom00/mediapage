"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { animate, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef } from "react";
import { AccountMenu } from "@/components/account-menu";

const LINKS = [
  { href: "/library", label: "Library" },
  { href: "/people", label: "People" },
] as const;

// The frame every page sits in: a flat bar with a 1px bottom border, the
// wordmark, and two plain destinations. Each word draws a 1px underline
// on hover; the current destination keeps a 2px bar.
export function SiteNav() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const bar = useRef<HTMLSpanElement>(null);
  const last = useRef<DOMRect | null>(null);

  // The bar slides from where it sat on the last page. Measured in the
  // viewport, where the sticky header never moves, so a click from a
  // scrolled page still slides sideways (a layoutId flew up the page).
  useLayoutEffect(() => {
    const el = bar.current;
    const from = last.current;
    const to = el?.getBoundingClientRect() ?? null;
    last.current = to;
    if (!el || !from || !to || reduce || from.left === to.left) return;
    animate(
      el,
      { x: [from.left - to.left, 0], scaleX: [from.width / to.width, 1] },
      { type: "spring", stiffness: 500, damping: 40 },
    );
  }, [pathname, reduce]);

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-bg">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-1 px-2 sm:px-6"
      >
        <div className="flex min-w-0 items-center gap-0.5 sm:gap-3">
          <Link
            href="/"
            className="mr-0.5 flex min-h-11 shrink-0 items-center font-wordmark text-sm leading-none tracking-tight text-ink sm:mr-4 sm:text-2xl"
          >
            mediapage
          </Link>
          {LINKS.map(({ href, label }) => {
            const current =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={current ? "page" : undefined}
                data-current={current ? "true" : undefined}
                className="nav-link flex min-h-11 items-center px-1.5 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:text-ink focus-visible:text-ink data-[current=true]:text-ink sm:px-3 sm:text-sm"
              >
                <span className="nav-word">
                  {label}
                  {current && (
                    <span
                      ref={bar}
                      aria-hidden
                      className="absolute -bottom-1 left-0 right-0 h-0.5 origin-left bg-[var(--text)]"
                    />
                  )}
                </span>
              </Link>
            );
          })}
        </div>
        <AccountMenu />
      </nav>
    </header>
  );
}
