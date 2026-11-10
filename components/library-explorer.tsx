import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";

// A 16-bit librarian who walks the stacks, climbs the ladder, pulls a
// book off a high shelf, then — new — opens it: a large pixel tome
// rises beside them and turns through five chapter plates, one
// original motif per shelf (reel, TV, vinyl, cartridge, hardcover).
// Pure inline pixel-art SVG animated by one synced 50s CSS timeline.
// Decorative; lives inside the aria-hidden LibraryBackdrop and
// freezes entirely under prefers-reduced-motion (librarian resting at
// the ladder, tome hidden).
//
// EXTENDED rather than replaced: the existing walk → climb → pull
// journey is the setup beat the reveal needs; only the timeline is
// retimed (26s → 50s) and the tome layer added on the same clock.

// One pixel-art plate per category, 16×16, drawn from rects like the
// librarian sprite. Original motifs only — no covers, posters, logos.
// Greys only, so the scene reads as a dim neutral picture behind the form.
const MOTIFS: Record<string, React.ReactNode> = {
  movie: (
    // Film reel
    <>
      <rect x="4" y="1" width="8" height="2" fill="#7a7a7a" />
      <rect x="2" y="3" width="12" height="2" fill="#7a7a7a" />
      <rect x="1" y="5" width="14" height="6" fill="#7a7a7a" />
      <rect x="2" y="11" width="12" height="2" fill="#7a7a7a" />
      <rect x="4" y="13" width="8" height="2" fill="#7a7a7a" />
      <rect x="4" y="2" width="3" height="1" fill="#d4d4d4" opacity="0.35" />
      <rect x="5" y="4" width="2" height="2" fill="#141414" />
      <rect x="9" y="4" width="2" height="2" fill="#141414" />
      <rect x="5" y="10" width="2" height="2" fill="#141414" />
      <rect x="9" y="10" width="2" height="2" fill="#141414" />
      <rect x="6" y="6" width="4" height="4" fill="#d4d4d4" />
      <rect x="7" y="7" width="2" height="2" fill="#141414" />
    </>
  ),
  shows: (
    // Rabbit-ear television
    <>
      <rect x="4" y="1" width="1" height="1" fill="#3a3a3a" />
      <rect x="5" y="2" width="1" height="1" fill="#3a3a3a" />
      <rect x="5" y="3" width="1" height="2" fill="#3a3a3a" />
      <rect x="11" y="1" width="1" height="1" fill="#3a3a3a" />
      <rect x="10" y="2" width="1" height="1" fill="#3a3a3a" />
      <rect x="10" y="3" width="1" height="2" fill="#3a3a3a" />
      <rect x="2" y="5" width="12" height="8" fill="#4d4d4d" />
      <rect x="4" y="7" width="7" height="4" fill="#d4d4d4" />
      <rect x="4" y="9" width="7" height="1" fill="#a5a5a5" />
      <rect x="12" y="7" width="1" height="1" fill="#d4d4d4" />
      <rect x="12" y="9" width="1" height="1" fill="#d4d4d4" />
      <rect x="4" y="13" width="2" height="1" fill="#3a3a3a" />
      <rect x="10" y="13" width="2" height="1" fill="#3a3a3a" />
    </>
  ),
  music: (
    // Vinyl record
    <>
      <rect x="4" y="1" width="8" height="2" fill="#2c2c2c" />
      <rect x="2" y="3" width="12" height="2" fill="#2c2c2c" />
      <rect x="1" y="5" width="14" height="6" fill="#2c2c2c" />
      <rect x="2" y="11" width="12" height="2" fill="#2c2c2c" />
      <rect x="4" y="13" width="8" height="2" fill="#2c2c2c" />
      <rect x="5" y="3" width="5" height="1" fill="#a5a5a5" opacity="0.45" />
      <rect x="3" y="6" width="1" height="3" fill="#a5a5a5" opacity="0.45" />
      <rect x="9" y="12" width="4" height="1" fill="#a5a5a5" opacity="0.3" />
      <rect x="6" y="6" width="4" height="4" fill="#8c8c8c" />
      <rect x="7" y="7" width="2" height="2" fill="#141414" />
    </>
  ),
  game: (
    // Cartridge
    <>
      <rect x="3" y="2" width="10" height="11" fill="#333333" />
      <rect x="3" y="2" width="1" height="1" fill="#141414" />
      <rect x="12" y="2" width="1" height="1" fill="#141414" />
      <rect x="5" y="4" width="6" height="5" fill="#d4d4d4" />
      <rect x="7" y="5" width="2" height="2" fill="#8c8c8c" />
      <rect x="6" y="7" width="4" height="1" fill="#7a7a7a" />
      <rect x="5" y="10" width="6" height="1" fill="#141414" />
      <rect x="5" y="12" width="6" height="1" fill="#141414" />
      <rect x="4" y="13" width="8" height="1" fill="#141414" />
    </>
  ),
  book: (
    // Hardcover — the same red book the librarian pulls, enlarged
    <>
      <rect x="3" y="2" width="9" height="12" fill="#8c8c8c" />
      <rect x="3" y="2" width="1" height="12" fill="#5e5e5e" />
      <rect x="5" y="4" width="6" height="1" fill="#d4d4d4" />
      <rect x="5" y="6" width="6" height="1" fill="#d4d4d4" />
      <rect x="12" y="3" width="1" height="10" fill="#bdbdbd" />
    </>
  ),
};

function LibraryTome() {
  return (
    <div data-testid="library-tome" className="library-tome">
      <div className="tome-float">
        <div className="tome-book">
          <div className="tome-pages">
            {CATEGORY_ORDER.map((category, i) => (
              <div
                key={category}
                className={`tome-leaf tome-leaf-${i + 1}`}
              >
                <div className="tome-label">
                  <span className="tome-name">{CATEGORY_LABELS[category]}</span>
                </div>
                <svg
                  width="52"
                  height="52"
                  viewBox="0 0 16 16"
                  shapeRendering="crispEdges"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {MOTIFS[category]}
                </svg>
              </div>
            ))}
            <div className="tome-flip-page" />
          </div>
          <div className="tome-edge" />
        </div>
      </div>
    </div>
  );
}

// Distant silhouette pacing the upper aisle. Rendered separately from
// LibraryExplorer so LibraryBackdrop can place it BEFORE the vignette —
// the vignette then dims it, which is what sells it as a hazy background
// figure rather than a second foreground character.
export function LibraryStrider() {
  return (
    <div data-testid="library-strider" className="strider">
      <div className="strider-face">
        <div className="explorer-bob">
          <svg
            className="explorer-sprite"
            viewBox="0 0 16 24"
            shapeRendering="crispEdges"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g className="explorer-leg explorer-leg-back">
              <rect x="6" y="14" width="2" height="6" fill="currentColor" />
            </g>
            <g className="explorer-arm explorer-arm-back">
              <rect x="4" y="8" width="2" height="5" fill="currentColor" />
            </g>
            <rect x="5" y="7" width="6" height="7" fill="currentColor" />
            <rect x="5" y="2" width="6" height="4" fill="currentColor" />
            <g className="explorer-leg explorer-leg-front">
              <rect x="8" y="14" width="2" height="6" fill="currentColor" />
            </g>
            <g className="explorer-arm explorer-arm-front">
              <rect x="10" y="8" width="2" height="5" fill="currentColor" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

export function LibraryExplorer() {
  return (
    <>
      <div data-testid="library-stairs" className="library-stairs">
        <div className="stairs-steps" />
        <div className="stairs-rail" />
      </div>
      {/* The returns clerk — carries a stack of books up the stairs to
          the mid walkway and comes back down. */}
      <div data-testid="library-walker" className="walker">
        <div className="walker-face">
          <div className="explorer-bob">
            <svg
              className="explorer-sprite"
              viewBox="0 0 16 24"
              shapeRendering="crispEdges"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g className="explorer-leg explorer-leg-back">
                <rect x="6" y="15" width="2" height="5" fill="#3a3a3a" />
                <rect x="6" y="20" width="3" height="2" fill="#1d1d1d" />
              </g>
              <rect x="5" y="9" width="6" height="6" fill="#454545" />
              <rect x="5" y="14" width="6" height="1" fill="#1d1d1d" />
              <rect x="5" y="4" width="6" height="4" fill="#a5a5a5" />
              <rect x="5" y="7" width="6" height="1" fill="#8a8a8a" />
              <rect x="4" y="3" width="8" height="1" fill="#333333" />
              <rect x="5" y="1" width="6" height="2" fill="#333333" />
              <g className="explorer-leg explorer-leg-front">
                <rect x="8" y="15" width="2" height="5" fill="#444444" />
                <rect x="8" y="20" width="3" height="2" fill="#262626" />
              </g>
              {/* arm + carried returns stack */}
              <rect x="9" y="10" width="5" height="2" fill="#454545" />
              <rect x="13.4" y="10.4" width="1.2" height="1.2" fill="#a5a5a5" />
              <rect x="10" y="5.2" width="5" height="1.6" fill="#8c8c8c" />
              <rect x="10" y="6.8" width="5" height="1.6" fill="#d4d4d4" />
              <rect x="10" y="8.4" width="5" height="1.6" fill="#333333" />
            </svg>
          </div>
        </div>
      </div>
      <div data-testid="library-ladder" className="library-ladder" />
      <div data-testid="library-explorer" className="explorer">
        <div className="explorer-bob">
          <svg
            className="explorer-sprite"
            viewBox="0 0 16 24"
            shapeRendering="crispEdges"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* back leg */}
            <g className="explorer-leg explorer-leg-back">
              <rect x="6" y="15" width="2" height="5" fill="#3a3a3a" />
              <rect x="6" y="20" width="3" height="2" fill="#1d1d1d" />
            </g>
            {/* back arm */}
            <g className="explorer-arm explorer-arm-back">
              <rect x="3" y="9" width="2" height="6" fill="#383838" />
            </g>
            {/* torso / tunic */}
            <rect x="5" y="9" width="6" height="6" fill="#4d4d4d" />
            <rect x="5" y="14" width="6" height="1" fill="#1d1d1d" />
            {/* head */}
            <rect x="5" y="4" width="6" height="4" fill="#a5a5a5" />
            <rect x="5" y="7" width="6" height="1" fill="#8a8a8a" />
            {/* hat */}
            <rect x="4" y="3" width="8" height="1" fill="#5e5e5e" />
            <rect x="5" y="1" width="6" height="2" fill="#5e5e5e" />
            {/* front leg */}
            <g className="explorer-leg explorer-leg-front">
              <rect x="8" y="15" width="2" height="5" fill="#444444" />
              <rect x="8" y="20" width="3" height="2" fill="#262626" />
            </g>
            {/* front / reaching arm, with a book that appears at the top */}
            <g className="explorer-arm explorer-arm-reach">
              <rect x="11" y="9" width="2" height="6" fill="#555555" />
              <rect x="11" y="14" width="2" height="1" fill="#a5a5a5" />
              <rect
                className="explorer-book"
                x="9"
                y="13.4"
                width="5.5"
                height="4.2"
                fill="#8c8c8c"
              />
              <rect
                className="explorer-book"
                x="9.6"
                y="14.1"
                width="4.4"
                height="0.7"
                fill="#d4d4d4"
              />
              <rect
                className="explorer-book"
                x="9.6"
                y="15.4"
                width="4.4"
                height="0.7"
                fill="#d4d4d4"
              />
            </g>
          </svg>
        </div>
      </div>
      <LibraryTome />
    </>
  );
}
