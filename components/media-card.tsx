import { CoverImage } from "@/components/cover-image";
import type { MediaItem } from "@/lib/types";

function coverAlt(item: MediaItem): string {
  return item.year
    ? `${item.title} (${item.year}) cover art`
    : `${item.title} cover art`;
}

export function MediaCard({ item }: { item: MediaItem }) {
  // Hover styles respond to the card itself and to a wrapping
  // `.group` (the library wraps cards with an overlay button that
  // would otherwise swallow :hover).
  return (
    <article className="flex h-full flex-col border border-edge bg-surface shadow-lg shadow-black/30 transition-[transform,border-color] duration-200 ease-[ease] hover:-translate-y-1 hover:rotate-[0.4deg] hover:border-glow/40 group-hover:-translate-y-1 group-hover:rotate-[0.4deg] group-hover:border-glow/40 motion-reduce:transition-none motion-reduce:transform-none motion-reduce:hover:translate-y-0 motion-reduce:hover:rotate-0 motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:rotate-0">
      <div className="relative aspect-[2/3] w-full overflow-hidden border-b border-edge bg-surface-raised">
        <CoverImage src={item.imageUrl} alt={coverAlt(item)} />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-medium leading-snug text-ink">{item.title}</h3>
        <p className="min-h-4 font-label text-xs text-ink-muted">
          {[item.year, item.subtitle ?? item.genres?.[0]]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </article>
  );
}
