"use client";

import { ArrowDown } from "lucide-react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import Link from "next/link";
import { Fragment, useRef } from "react";
import { Chapters } from "@/components/landing/chapters";
import { RoomScene } from "@/components/landing/room-scene";
import { CAPTION_SPAN, STATIONS, type Station } from "@/components/landing/stations";

// The landing, top to bottom: the hero over a low-poly room; a walk
// through that room's five stations by scrolling; one pinned moment
// showing how a profile works; the five shelves on the page's one light
// band; a close.
//
// The walk is CSS-sized (no layout shift, no script needed to read the
// page) and only exists under prefers-reduced-motion: no-preference.
// Under reduce, the track collapses to the hero screen and the room is
// a still poster.

const HEADLINE = [
  "Your five favorites",
  "in movies, shows,",
  "music, games and",
  "books, on one page.",
];

function Caption({ station, progress }: { station: Station; progress: MotionValue<number> }) {
  const a = station.at;
  const s = CAPTION_SPAN;
  const range = [a - s, a - s / 2, a + s / 2, a + s];
  const opacity = useTransform(progress, range, [0, 1, 1, 0]);
  const y = useTransform(progress, range, [14, 0, 0, -14]);
  const visibility = useTransform(opacity, (o) => (o < 0.01 ? "hidden" : "visible"));
  return (
    <motion.div className="room-caption" style={{ opacity, y, visibility }}>
      <div className="card room-caption-card">
        <p className="room-caption-name">
          <span className="lp-dot" style={{ background: station.hueVar }} />
          {station.name}
        </p>
        <p className="room-caption-line">{station.line}</p>
      </div>
    </motion.div>
  );
}

export function Landing() {
  const trackRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  // The skip control stays until the walk has run its course.
  const chrome = useTransform(scrollYProgress, [0.9, 0.95], [1, 0]);
  const chromeVisibility = useTransform(chrome, (o) => (o < 0.01 ? "hidden" : "visible"));

  const skipToShelves = () => {
    document
      .getElementById("shelves-heading")
      ?.scrollIntoView({ behavior: "auto", block: "start" });
  };

  return (
    <div className="room-page">
      <section ref={trackRef} className="room-track" aria-label="A walk through the room">
        <div className="room-stage">
          <RoomScene progress={scrollYProgress} trackRef={trackRef} />

          {/* Captions name each station as the camera settles on it. They
              repeat the shelf index below, so they stay out of the
              accessibility tree. */}
          <div className="room-captions" aria-hidden="true">
            {STATIONS.map((station) => (
              <Caption key={station.name} station={station} progress={scrollYProgress} />
            ))}
          </div>

          <motion.div className="room-skip" style={{ opacity: chrome, visibility: chromeVisibility }}>
            <button
              type="button"
              onClick={skipToShelves}
              aria-label="Skip to the five shelves"
              title="Skip to the five shelves"
              className="btn room-skip-btn"
            >
              <ArrowDown aria-hidden="true" size={18} strokeWidth={2} />
            </button>
          </motion.div>
        </div>

        {/* Hero: stands over the room for one screen, then scrolls away
            while the room walks on. */}
        <div className="room-hero">
          <div className="room-hero-copy">
            <h1 className="room-headline">
              {HEADLINE.map((line, i) => (
                <Fragment key={line}>
                  <span className="enter-line" style={{ "--enter-i": i } as React.CSSProperties}>
                    <span>{line}</span>
                  </span>{" "}
                </Fragment>
              ))}
            </h1>
            <p
              className="room-lede enter-up"
              style={{ "--enter-i": 0 } as React.CSSProperties}
            >
              Put five up front on each shelf, write why they matter, and follow
              people whose taste you trust.
            </p>
            <div className="room-ctas">
              <div className="enter-up" style={{ "--enter-i": 1 } as React.CSSProperties}>
                <Link href="/login" className="btn btn-primary room-cta">
                  Start your shelf
                </Link>
              </div>
              <div className="enter-up" style={{ "--enter-i": 2 } as React.CSSProperties}>
                <Link href="/library" className="btn room-cta">
                  Browse the library
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Chapters />

      <section aria-labelledby="shelves-heading" className="lp-idx bg-inv-bg text-inv-ink">
        <div className="lp-idx-in">
          <h2 id="shelves-heading" className="lp-idx-title">
            The five shelves
          </h2>
          <ul className="lp-idx-list">
            {STATIONS.map((station) => (
              <li key={station.name} className="lp-idx-row">
                <span className="lp-idx-name">
                  <span className="lp-dot lp-dot-lg" style={{ background: station.hueVar }} />
                  {station.name}
                </span>
                <span className="lp-idx-line text-inv-muted">{station.line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="close-heading" className="lp-close">
        <h2 id="close-heading" className="lp-close-title">
          The next shelf is yours to fill.
        </h2>
        <Link href="/login" className="btn btn-primary room-cta">
          Start your shelf
        </Link>
      </section>
    </div>
  );
}
