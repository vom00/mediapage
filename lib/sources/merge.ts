import type { SearchPage } from "@/lib/sources/types";
import type { MediaItem } from "@/lib/types";

function interleave(lists: MediaItem[][]): MediaItem[] {
  const merged: MediaItem[] = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) {
    for (const list of lists) {
      if (i < list.length) merged.push(list[i]);
    }
  }
  return merged;
}

// Merges several source searches for one category into a single
// page, interleaving so no source dominates. Sources that reject are
// skipped so one outage or missing key never sinks the whole shelf;
// only when every source fails does the first rejection propagate.
export function mergeSearchResults(
  results: PromiseSettledResult<SearchPage>[],
  page: number,
): SearchPage {
  const fulfilled = results.filter(
    (r): r is PromiseFulfilledResult<SearchPage> => r.status === "fulfilled",
  );

  if (fulfilled.length === 0) {
    const rejection = results.find(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    throw rejection ? rejection.reason : new Error("No sources available.");
  }

  return {
    items: interleave(fulfilled.map((r) => r.value.items)),
    page,
    hasMore: fulfilled.some((r) => r.value.hasMore),
  };
}
