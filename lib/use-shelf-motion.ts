"use client";

import { useLayoutEffect, useRef } from "react";
import { computeFlipDeltas, type FlipRect } from "@/lib/flip";

const SLIDE_MS = 260;
const SETTLE_MS = 300;
// On-screen movement eases in and out; entrances ease out.
const SLIDE_EASE = "cubic-bezier(0.645, 0.045, 0.355, 1)";
const SETTLE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// Animates shelf cases between layouts: FLIP slides when picks
// reorder or a neighbor leaves, a single settle drop when a new pick
// arrives. Inert under prefers-reduced-motion. Register each case
// element through the returned ref callback, keyed by pick id.
export function useShelfMotion(orderKey: string) {
  const caseElements = useRef(new Map<string, HTMLElement>());
  const prevRects = useRef(new Map<string, FlipRect>());
  const prevIds = useRef(new Set<string>());

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const nextRects = new Map<string, FlipRect>();
    for (const [id, el] of caseElements.current) {
      const rect = el.getBoundingClientRect();
      nextRects.set(id, { left: rect.left, top: rect.top });
    }

    if (!reduceMotion) {
      for (const [id, delta] of computeFlipDeltas(
        prevRects.current,
        nextRects,
      )) {
        caseElements.current.get(id)?.animate(
          [
            { transform: `translate(${delta.dx}px, ${delta.dy}px)` },
            { transform: "translate(0px, 0px)" },
          ],
          { duration: SLIDE_MS, easing: SLIDE_EASE },
        );
      }
      // New arrivals settle onto the plank; skipped on first paint so
      // the page reveal owns the entrance.
      if (prevIds.current.size > 0) {
        for (const id of nextRects.keys()) {
          if (!prevIds.current.has(id)) {
            caseElements.current.get(id)?.animate(
              [
                { transform: "translateY(-14px)", opacity: 0 },
                { transform: "translateY(0px)", opacity: 1 },
              ],
              { duration: SETTLE_MS, easing: SETTLE_EASE },
            );
          }
        }
      }
    }

    prevRects.current = nextRects;
    prevIds.current = new Set(nextRects.keys());
    // orderKey changes whenever the pick order changes.
  }, [orderKey]);

  return (id: string) => (el: HTMLElement | null) => {
    if (el) caseElements.current.set(id, el);
    else caseElements.current.delete(id);
  };
}
