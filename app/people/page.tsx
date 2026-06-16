import type { Metadata } from "next";
import { PeopleSearch } from "@/components/people-search";

export const metadata: Metadata = {
  title: "People",
};

export default function PeoplePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
      <p className="reveal font-label text-xs uppercase tracking-[0.3em] text-ink-muted">
        Find your people
      </p>
      <h1 className="reveal mt-3 font-display text-4xl tracking-tight sm:text-5xl">
        People
      </h1>
      <div
        className="reveal mt-10"
        style={{ "--reveal-delay": "120ms" } as React.CSSProperties}
      >
        <PeopleSearch />
      </div>
    </div>
  );
}
