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
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-20">
      <h1 className="text-4xl font-medium leading-[1.05] tracking-[-0.04em] sm:text-6xl">
        <span className="enter-line">
          <span>Library</span>
        </span>
      </h1>
      <div className="mt-8 sm:mt-12">
        <LibrarySearch initialCategory={initialCategory} />
      </div>
    </div>
  );
}
