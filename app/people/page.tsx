import type { Metadata } from "next";
import { PeopleSearch } from "@/components/people-search";

export const metadata: Metadata = {
  title: "People",
};

export default function PeoplePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-20">
      <h1 className="text-4xl font-medium leading-[1.05] tracking-[-0.04em] sm:text-6xl">
        <span className="enter-line">
          <span>People</span>
        </span>
      </h1>
      <div className="mt-8 sm:mt-12">
        <PeopleSearch />
      </div>
    </div>
  );
}
