import Link from "next/link";
import { LibraryBackdrop } from "@/components/library-backdrop";

const CATEGORIES = [
  { name: "Movies", line: "First viewings, lifetime favorites" },
  { name: "Shows", line: "Series and anime you never stopped thinking about" },
  { name: "Music", line: "Records that rewired you" },
  { name: "Video Games", line: "Worlds you lived in" },
  { name: "Books", line: "Novels and manga, spines cracked from rereading" },
];

function revealAt(ms: number): React.CSSProperties {
  return { "--reveal-delay": `${ms}ms` } as React.CSSProperties;
}

export function Landing() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <LibraryBackdrop />

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-3.6rem)] w-full max-w-6xl flex-col items-center justify-center px-6 py-24 text-center">
          <p
            className="reveal font-label text-xs uppercase tracking-[0.3em] text-ink-muted"
            style={revealAt(0)}
          >
            Your taste, on one page
          </p>
          <h1
            className="reveal mt-8 max-w-5xl font-display text-5xl leading-[0.95] tracking-tight sm:text-7xl md:text-8xl"
            style={revealAt(80)}
          >
            Five favorites. Five shelves. One profile.
          </h1>
          <p
            className="reveal mx-auto mt-8 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg"
            style={revealAt(160)}
          >
            mediapage is where your whole taste lives. Pin the five works you
            would defend forever in each shelf, write the recommendation only
            you could write, and follow the people whose shelves you trust.
          </p>
          <div
            className="reveal mt-12 flex flex-wrap items-center justify-center gap-4"
            style={revealAt(240)}
          >
            <Link
              href="/login"
              className="liquid-glass flex min-h-12 items-center rounded-full px-10 text-base text-ink transition-transform duration-200 ease-[ease] hover:scale-[1.03] motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              Start your shelf
            </Link>
            <Link
              href="/library"
              className="liquid-glass flex min-h-12 items-center rounded-full px-10 text-base text-ink transition-transform duration-200 ease-[ease] hover:scale-[1.03] motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              Browse the library
            </Link>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="shelves-heading"
        className="mx-auto w-full max-w-6xl px-6 pb-28 pt-16"
      >
        <h2
          id="shelves-heading"
          className="reveal font-label text-xs uppercase tracking-[0.3em] text-ink-muted"
          style={revealAt(0)}
        >
          The five shelves
        </h2>
        <ol className="mt-6">
          {CATEGORIES.map((category, i) => (
            <li
              key={category.name}
              className="reveal flex items-center gap-6 border-t border-edge py-6 transition-colors duration-200 last:border-b hover:bg-surface"
              style={revealAt(60 + i * 90)}
            >
              <span
                className="w-10 shrink-0 font-label text-xs text-ink-muted"
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-display text-3xl tracking-tight sm:text-4xl">
                {category.name}
              </span>
              <span className="ml-auto hidden max-w-64 text-right text-sm text-ink-muted sm:block">
                {category.line}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
