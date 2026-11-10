import { LibraryExplorer, LibraryStrider } from "@/components/library-explorer";

// The pixel library hall: rows of book spines in dim greys climbing the
// whole wall and fading toward the ceiling, drifting
// dust, a 16-bit librarian browsing the stacks, and a flat dimming layer
// that keeps the page content legible. Purely decorative; fully inert under
// reduced motion. Place inside a `relative` container with content above it.

// Deterministic placements so server and client render identically.
const MOTES = Array.from({ length: 12 }, (_, i) => ({
  left: `${(i * 83 + 9) % 100}%`,
  bottom: `${(i * 37 + 5) % 55}%`,
  animationDuration: `${14 + (i % 5) * 4}s`,
  animationDelay: `${(i * 1.7) % 12}s`,
}));

export function LibraryBackdrop() {
  return (
    <div
      data-testid="library-backdrop"
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
    >
      <div className="library-wall">
        <div className="library-row library-row-last" />
        <div className="library-row library-row-top" />
        <div className="library-row library-row-upper" />
        <div className="library-row library-row-higher" />
        <div className="library-row library-row-high" />
        <div className="library-row library-row-far" />
        <div className="library-row library-row-mid" />
        <div className="library-row library-row-near" />
      </div>
      {MOTES.map((mote, i) => (
        <span key={i} className="mote" style={mote} />
      ))}
      {/* Rendered before the vignette so it dims this one figure into a
          dim background silhouette, distinct from the foreground cast
          LibraryExplorer renders after the vignette. */}
      <LibraryStrider />
      <div className="library-vignette" />
      <LibraryExplorer />
    </div>
  );
}
