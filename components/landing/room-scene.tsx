"use client";

import type { MotionValue } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

// The stage behind the walk: a static poster of the room that is in
// the server HTML (so nothing waits on WebGL), with the live canvas
// loaded after first paint and cross-faded over it once its first frame
// is on screen. Poster only under reduced motion, without WebGL, or
// after the GPU drops the context.

const RoomCanvas = dynamic(() => import("./room-canvas"), { ssr: false });

type Mode = "poster" | "loading" | "live";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function RoomScene({
  progress,
  trackRef,
}: {
  progress: MotionValue<number>;
  trackRef: React.RefObject<HTMLElement | null>;
}) {
  const [mode, setMode] = useState<Mode>("poster");
  const [lite, setLite] = useState(false);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches || !hasWebGL()) return;
    // After first paint and once the main thread is quiet: the headline
    // and poster are already on screen, the canvas is a bonus.
    const start = () => {
      setLite(window.matchMedia("(max-width: 767px), (pointer: coarse)").matches);
      setMode((m) => (m === "poster" ? "loading" : m));
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idle = 0;
    const timer = window.setTimeout(() => {
      idle = w.requestIdleCallback ? w.requestIdleCallback(start, { timeout: 1200 }) : (start(), 0);
    }, 200);
    const onReduce = () => {
      if (reduce.matches) setMode("poster");
    };
    reduce.addEventListener("change", onReduce);
    return () => {
      window.clearTimeout(timer);
      if (idle && w.cancelIdleCallback) w.cancelIdleCallback(idle);
      reduce.removeEventListener("change", onReduce);
    };
  }, []);

  // Pause entirely while the walk is off screen.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || mode === "poster") return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      rootMargin: "100px 0px",
    });
    io.observe(track);
    return () => io.disconnect();
  }, [trackRef, mode]);

  const onReady = useCallback(() => setMode((m) => (m === "loading" ? "live" : m)), []);
  const onLost = useCallback(() => setMode("poster"), []);

  return (
    <div className="room-scene" data-testid="room-scene" data-mode={mode} aria-hidden="true">
      <picture>
        <source media="(max-aspect-ratio: 4/5)" srcSet="/landing/room-poster-tall.webp" />
        <img className="room-poster" src="/landing/room-poster.webp" alt="" decoding="async" />
      </picture>
      {mode !== "poster" && (
        <div className="room-canvas">
          <RoomCanvas progress={progress} lite={lite} active={active} onReady={onReady} onLost={onLost} />
        </div>
      )}
    </div>
  );
}
