import type { Metadata } from "next";
import { LibrarySearch } from "@/components/library-search";
import { isMediaCategory } from "@/lib/sources/registry";
import type { MediaCategory } from "@/lib/types";

export const metadata: Metadata = {
  title: "Library",
};

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const initialCategory: MediaCategory | undefined =
    category && isMediaCategory(category) ? category : undefined;
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
      <h1 className="reveal font-display text-4xl tracking-tight sm:text-5xl">
        Library
      </h1>
      <div className="reveal mt-10" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
        <LibrarySearch initialCategory={initialCategory} />
      </div>
    </div>
  );
}
