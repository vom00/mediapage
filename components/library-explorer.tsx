// A 16-bit librarian who walks the stacks, climbs the ladder, and
// pulls a book off a high shelf, then climbs down and wanders on.
// Pure inline pixel-art SVG animated by a synced CSS timeline.
// Decorative; lives inside the aria-hidden LibraryBackdrop and
// freezes entirely under prefers-reduced-motion.
export function LibraryExplorer() {
  return (
    <>
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
              <rect x="6" y="15" width="2" height="5" fill="#3a2c20" />
              <rect x="6" y="20" width="3" height="2" fill="#241a12" />
            </g>
            {/* back arm */}
            <g className="explorer-arm explorer-arm-back">
              <rect x="3" y="9" width="2" height="6" fill="#3a2e1f" />
            </g>
            {/* torso / tunic */}
            <rect x="5" y="9" width="6" height="6" fill="#4a3b28" />
            <rect x="5" y="14" width="6" height="1" fill="#241a12" />
            {/* head */}
            <rect x="5" y="4" width="6" height="4" fill="#c9a884" />
            <rect x="5" y="7" width="6" height="1" fill="#a8855f" />
            {/* hat */}
            <rect x="4" y="3" width="8" height="1" fill="#5b2b2e" />
            <rect x="5" y="1" width="6" height="2" fill="#5b2b2e" />
            {/* front leg */}
            <g className="explorer-leg explorer-leg-front">
              <rect x="8" y="15" width="2" height="5" fill="#46372a" />
              <rect x="8" y="20" width="3" height="2" fill="#2a1f15" />
            </g>
            {/* front / reaching arm, with a book that appears at the top */}
            <g className="explorer-arm explorer-arm-reach">
              <rect x="11" y="9" width="2" height="6" fill="#52402b" />
              <rect x="11" y="14" width="2" height="1" fill="#c9a884" />
              <rect
                className="explorer-book"
                x="9"
                y="13.4"
                width="5.5"
                height="4.2"
                fill="#b23a3a"
              />
              <rect
                className="explorer-book"
                x="9.6"
                y="14.1"
                width="4.4"
                height="0.7"
                fill="#f0dcae"
              />
              <rect
                className="explorer-book"
                x="9.6"
                y="15.4"
                width="4.4"
                height="0.7"
                fill="#f0dcae"
              />
            </g>
          </svg>
        </div>
      </div>
    </>
  );
}
