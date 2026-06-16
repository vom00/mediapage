import { CoverImage } from "@/components/cover-image";
import { pieceKind } from "@/lib/shelf-piece";
import type { MediaItem } from "@/lib/types";

function coverAlt(item: MediaItem): string {
  return item.year
    ? `${item.title} (${item.year}) cover art`
    : `${item.title} cover art`;
}

// Renders a single shelf pick as its category's physical object:
// a blu-ray case, a TV playing the cover, a vinyl record, a game
// case, or a hardcover book. Monochrome chrome around the real
// (color) cover art. Fills its positioned parent (the .shelf-case
// aspect box).
export function ShelfPiece({ item }: { item: MediaItem }) {
  const kind = pieceKind(item.category);
  const alt = coverAlt(item);

  if (kind === "vinyl") {
    return (
      <div data-piece="vinyl" className="piece piece-vinyl">
        <div className="piece-vinyl-disc">
          <div className="piece-vinyl-label">
            <CoverImage src={item.imageUrl} alt={alt} />
          </div>
          <span className="piece-vinyl-hole" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (kind === "tablet") {
    return (
      <div data-piece="tablet" className="piece piece-tablet">
        <div className="piece-tablet-body">
          <span className="piece-tablet-cam" aria-hidden="true" />
          <div className="piece-tablet-screen">
            <CoverImage src={item.imageUrl} alt={alt} />
            <span className="piece-tablet-glare" aria-hidden="true" />
          </div>
          <span className="piece-tablet-home" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (kind === "book") {
    return (
      <div data-piece="book" className="piece piece-book">
        <div className="piece-book-art">
          <CoverImage src={item.imageUrl} alt={alt} />
        </div>
        <span className="piece-book-pages" aria-hidden="true" />
        <span className="piece-book-spine" aria-hidden="true" />
        <span className="piece-book-sheen" aria-hidden="true" />
      </div>
    );
  }

  if (kind === "game") {
    return (
      <div data-piece="game" className="piece piece-game">
        <div className="piece-game-art">
          <CoverImage src={item.imageUrl} alt={alt} />
        </div>
        <span className="piece-game-header" aria-hidden="true">
          {/* PlayStation "PS" wordmark logo, drawn into the platform band. */}
          <svg
            className="piece-game-logo"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M8.984 2.596v17.547l3.915 1.261V6.688c0-.69.304-1.151.794-.991.636.18.76.814.76 1.505v5.875c2.441 1.193 4.362-.002 4.362-3.152 0-3.237-1.126-4.675-4.438-5.827-1.307-.448-3.728-1.186-5.39-1.502zm4.656 16.241l6.296-2.275c.715-.258.826-.625.246-.818-.586-.192-1.637-.139-2.357.123l-4.205 1.5V14.98l.24-.085s1.201-.42 2.913-.615c1.696-.18 3.785.03 5.437.661 1.848.601 2.04 1.472 1.576 2.072-.465.6-1.622 1.036-1.622 1.036l-8.544 3.107V18.86zM1.807 18.6c-1.9-.545-2.214-1.668-1.352-2.32.801-.586 2.16-1.052 2.16-1.052l5.615-2.013v2.313L4.205 17c-.705.271-.825.632-.239.826.586.195 1.637.15 2.343-.12L8.247 17v2.074c-.12.03-.256.044-.39.073-1.939.331-3.996.196-6.038-.479z" />
          </svg>
        </span>
        <span className="piece-game-spine" aria-hidden="true" />
        <span className="piece-game-sheen" aria-hidden="true" />
      </div>
    );
  }

  // bluray
  return (
    <div data-piece="bluray" className="piece piece-bluray">
      <div className="piece-bluray-art">
        <CoverImage src={item.imageUrl} alt={alt} />
      </div>
      <span className="piece-bluray-band" aria-hidden="true">
        <span className="piece-bluray-logo">Blu-ray™</span>
      </span>
      <span className="piece-bluray-spine" aria-hidden="true" />
    </div>
  );
}
