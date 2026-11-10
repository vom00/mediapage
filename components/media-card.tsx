import type { CSSProperties } from "react";
import { CoverImage } from "@/components/cover-image";
import type { MediaCategory, MediaItem } from "@/lib/types";

// Each shelf's hue, as a CSS variable reference. Components set it as
// `--shelf` on a wrapper and read it with `border-(--shelf)` etc.
export const SHELF_HUE: Record<MediaCategory, string> = {
  movie: "var(--shelf-movies)",
  shows: "var(--shelf-shows)",
  music: "var(--shelf-music)",
  game: "var(--shelf-games)",
  book: "var(--shelf-books)",
};

export function shelfStyle(category: MediaCategory): CSSProperties {
  return { "--shelf": SHELF_HUE[category] } as CSSProperties;
}

function coverAlt(item: MediaItem): string {
  return item.year
    ? `${item.title} (${item.year}) cover art`
    : `${item.title} cover art`;
}

// The text block under a cover has a fixed height (two title lines plus
// one line of facts) so the loading skeleton can occupy exactly the
// same space as a real card.
export const CARD_INFO_HEIGHT = "h-[4.5rem]";

export function MediaCard({ item }: { item: MediaItem }) {
  // Hover styles respond to the card itself and to a wrapping
  // `.group` (the library wraps cards with an overlay button that
  // would otherwise swallow :hover). The cover is the colour on the
  // page; everything else stays quiet until the card is picked up.
  return (
    <article
      style={shelfStyle(item.category)}
      className="flex h-full flex-col transition-[translate] duration-[180ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:group-hover:translate-y-0 motion-reduce:[&_img]:scale-100!"
    >
      <div className="m-zoom relative aspect-[2/3] w-full rounded-[var(--radius-md)] border border-edge bg-surface-raised transition-[border-color] duration-[180ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:border-ink-muted group-hover:border-ink-muted">
        <CoverImage src={item.imageUrl} alt={coverAlt(item)} />
      </div>
      <div className={`flex flex-col gap-1 pt-3 ${CARD_INFO_HEIGHT}`}>
        <h3 className="line-clamp-2 text-[0.9375rem] font-medium leading-5 tracking-tight text-ink">
          {item.title}
        </h3>
        <p className="min-h-4 truncate font-label text-xs text-ink-muted">
          {[item.year, item.subtitle ?? item.genres?.[0]]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </article>
  );
}
