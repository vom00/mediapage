"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// What goes on the shelves, as one slow row of words. The catalog really
// holds each of these: films and series (TMDB), anime and manga
// (AniList), artists (Deezer), video games (IGDB or Steam) and novels
// (Open Library).
//
// At rest (server HTML, reduced motion, phones) the words stand in a
// wrapped row. Where the viewport suits it the effect below switches the
// loop on: the list and two silent copies move left by one list width,
// forever, at a steady pace. It runs only while on screen, holds under
// the pointer, and carries a pause button.

const WORDS = ["Films", "Series", "Anime", "Artists", "Video games", "Novels", "Manga"];

const LIVE_QUERY = "(min-width: 640px) and (prefers-reduced-motion: no-preference)";
/** Pixels per second. */
const SPEED = 44;

export function FormatsRow() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const [live, setLive] = useState(false);
  const [on, setOn] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(LIVE_QUERY);
    const sync = () => setLive(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!live || !root || !track) return;
    // One loop is one list width, so the pace stays the same whatever
    // the type size.
    const fit = () => {
      const w = track.scrollWidth;
      root.style.setProperty("--mq-w", `${w}px`);
      root.style.setProperty("--mq-dur", `${(w / SPEED).toFixed(2)}s`);
    };
    fit();
    const sizes = new ResizeObserver(fit);
    sizes.observe(track);
    const seen = new IntersectionObserver((entries) => {
      setOn(entries[entries.length - 1].isIntersecting);
    });
    seen.observe(root);
    return () => {
      sizes.disconnect();
      seen.disconnect();
      root.style.removeProperty("--mq-w");
      root.style.removeProperty("--mq-dur");
    };
  }, [live]);

  return (
    <div
      ref={rootRef}
      className="lp-mq"
      data-live={live ? "true" : undefined}
      data-on={on ? "true" : undefined}
      data-paused={paused ? "true" : undefined}
    >
      <div className="lp-mq-in">
        <div className="lp-mq-rail">
          <ul ref={trackRef} className="lp-mq-track" aria-label="What the shelves hold">
            {WORDS.map((word) => (
              <li key={word}>{word}</li>
            ))}
          </ul>
          {[0, 1].map((copy) => (
            <ul key={copy} className="lp-mq-track lp-mq-copy" aria-hidden="true">
              {WORDS.map((word) => (
                <li key={word}>{word}</li>
              ))}
            </ul>
          ))}
        </div>
        <button
          type="button"
          className="btn lp-mq-pause"
          aria-label={paused ? "Play the moving row" : "Pause the moving row"}
          onClick={() => setPaused((v) => !v)}
        >
          {paused ? (
            <Play aria-hidden="true" size={14} strokeWidth={2} />
          ) : (
            <Pause aria-hidden="true" size={14} strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  );
}
