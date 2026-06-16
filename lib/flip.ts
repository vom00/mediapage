// FLIP (First-Last-Invert-Play) geometry for the physical shelf.
// Given where each case was and where it is now, compute the
// inverted starting transform that makes it appear to slide from its
// old spot to the new one.

export interface FlipRect {
  left: number;
  top: number;
}

export interface FlipDelta {
  dx: number;
  dy: number;
}

// Movement below this threshold is layout jitter, not motion.
const MIN_DELTA_PX = 1;

export function computeFlipDeltas(
  prev: Map<string, FlipRect>,
  next: Map<string, FlipRect>,
): Map<string, FlipDelta> {
  const deltas = new Map<string, FlipDelta>();
  for (const [key, nextRect] of next) {
    const prevRect = prev.get(key);
    if (!prevRect) continue; // new arrival; the settle animation owns it
    const dx = prevRect.left - nextRect.left;
    const dy = prevRect.top - nextRect.top;
    if (Math.abs(dx) < MIN_DELTA_PX && Math.abs(dy) < MIN_DELTA_PX) continue;
    deltas.set(key, { dx, dy });
  }
  return deltas;
}
