"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

// The landing: a candlelit dolly through the stacks. The camera walks
// five shelf bays — one per category — driven by scroll, with the hero
// copy standing at the mouth of the corridor and a finale waiting at
// the far end. Everything decorative lives in an aria-hidden world;
// the real content (h1, CTAs, shelves index) sits on top of it.
// Fully inert under reduced motion: the track collapses to one screen
// and the camera never moves.

// Bay depths must match each bay's translateZ. Bay 1 sits deeper
// (-900) so Movies gets the same on-screen dwell as the other bays.
const BAY_DEPTHS = [-900, -1780, -2660, -3540, -4420];
const CAMERA_END = 4800; // total camera travel in px
const TRACK_VH = 550; // scroll length of the walk

type Flame = { top: string; duration: string; delay: string };

type Bay = {
  name: string;
  line: string;
  // Book-spine band sequence for each shelf wall. The spine tones are
  // the same sanctioned "aged book" palette as the library backdrop.
  spinesLeft: string;
  spinesRight: string;
  flameLeft: Flame;
  flameRight: Flame;
  float: { duration: string; delay: string };
  veil: number;
  art: React.ReactNode;
};

// Original 16x16 pixel motifs only — no covers, posters, or logos.
const BAYS: Bay[] = [
  {
    name: "Movies",
    line: "First viewings, lifetime favorites",
    spinesLeft:
      "#0c0c0f 0 2px, #5b2b2e 2px 20px, #0c0c0f 20px 22px, #4a3b28 22px 38px, #0c0c0f 38px 40px, #243a2f 40px 62px, #0c0c0f 62px 64px, #2a3550 64px 82px, #0c0c0f 82px 84px, #5a4520 84px 104px, #0c0c0f 104px 106px, #3a2c44 106px 128px, #0c0c0f 128px 130px",
    spinesRight:
      "#0c0c0f 0 2px, #3a2c44 2px 24px, #0c0c0f 24px 26px, #243a2f 26px 48px, #0c0c0f 48px 50px, #5b2b2e 50px 68px, #0c0c0f 68px 70px, #5a4520 70px 92px, #0c0c0f 92px 94px, #2a3550 94px 114px, #0c0c0f 114px 116px, #4a3b28 116px 138px, #0c0c0f 138px 140px",
    flameLeft: { top: "26%", duration: "2.8s", delay: "0s" },
    flameRight: { top: "34%", duration: "3.4s", delay: "0.6s" },
    float: { duration: "7s", delay: "0s" },
    veil: 0.23,
    art: (
      <>
        <rect x="4" y="1" width="8" height="2" fill="#2a3550" />
        <rect x="2" y="3" width="12" height="2" fill="#2a3550" />
        <rect x="1" y="5" width="14" height="6" fill="#2a3550" />
        <rect x="2" y="11" width="12" height="2" fill="#2a3550" />
        <rect x="4" y="13" width="8" height="2" fill="#2a3550" />
        <rect x="4" y="2" width="3" height="1" fill="#f0dcae" opacity="0.35" />
        <rect x="5" y="4" width="2" height="2" fill="#0c0c0f" />
        <rect x="9" y="4" width="2" height="2" fill="#0c0c0f" />
        <rect x="5" y="10" width="2" height="2" fill="#0c0c0f" />
        <rect x="9" y="10" width="2" height="2" fill="#0c0c0f" />
        <rect x="6" y="6" width="4" height="4" fill="#f0dcae" />
        <rect x="7" y="7" width="2" height="2" fill="#0c0c0f" />
      </>
    ),
  },
  {
    name: "Shows",
    line: "Series and anime you never stopped thinking about",
    spinesLeft:
      "#0c0c0f 0 2px, #243a2f 2px 22px, #0c0c0f 22px 24px, #5a4520 24px 42px, #0c0c0f 42px 44px, #5b2b2e 44px 64px, #0c0c0f 64px 66px, #3a2c44 66px 86px, #0c0c0f 86px 88px, #2a3550 88px 110px, #0c0c0f 110px 112px, #4a3b28 112px 132px, #0c0c0f 132px 134px",
    spinesRight:
      "#0c0c0f 0 2px, #5a4520 2px 20px, #0c0c0f 20px 22px, #2a3550 22px 44px, #0c0c0f 44px 46px, #4a3b28 46px 66px, #0c0c0f 66px 68px, #243a2f 68px 90px, #0c0c0f 90px 92px, #5b2b2e 92px 112px, #0c0c0f 112px 114px, #3a2c44 114px 136px, #0c0c0f 136px 138px",
    flameLeft: { top: "40%", duration: "3.1s", delay: "0.3s" },
    flameRight: { top: "24%", duration: "2.6s", delay: "1.1s" },
    float: { duration: "8s", delay: "0.8s" },
    veil: 0.6,
    art: (
      <>
        <rect x="4" y="1" width="1" height="1" fill="#3a2c20" />
        <rect x="5" y="2" width="1" height="1" fill="#3a2c20" />
        <rect x="5" y="3" width="1" height="2" fill="#3a2c20" />
        <rect x="11" y="1" width="1" height="1" fill="#3a2c20" />
        <rect x="10" y="2" width="1" height="1" fill="#3a2c20" />
        <rect x="10" y="3" width="1" height="2" fill="#3a2c20" />
        <rect x="2" y="5" width="12" height="8" fill="#4a3b28" />
        <rect x="4" y="7" width="7" height="4" fill="#f0dcae" />
        <rect x="4" y="9" width="7" height="1" fill="#c9a884" />
        <rect x="12" y="7" width="1" height="1" fill="#f0dcae" />
        <rect x="12" y="9" width="1" height="1" fill="#f0dcae" />
        <rect x="4" y="13" width="2" height="1" fill="#3a2c20" />
        <rect x="10" y="13" width="2" height="1" fill="#3a2c20" />
      </>
    ),
  },
  {
    name: "Music",
    line: "Records that rewired you",
    spinesLeft:
      "#0c0c0f 0 2px, #3a2c44 2px 24px, #0c0c0f 24px 26px, #5b2b2e 26px 44px, #0c0c0f 44px 46px, #2a3550 46px 68px, #0c0c0f 68px 70px, #4a3b28 70px 90px, #0c0c0f 90px 92px, #243a2f 92px 114px, #0c0c0f 114px 116px, #5a4520 116px 136px, #0c0c0f 136px 138px",
    spinesRight:
      "#0c0c0f 0 2px, #4a3b28 2px 20px, #0c0c0f 20px 22px, #243a2f 22px 44px, #0c0c0f 44px 46px, #3a2c44 46px 66px, #0c0c0f 66px 68px, #5a4520 68px 88px, #0c0c0f 88px 90px, #5b2b2e 90px 112px, #0c0c0f 112px 114px, #2a3550 114px 134px, #0c0c0f 134px 136px",
    flameLeft: { top: "30%", duration: "2.9s", delay: "0.9s" },
    flameRight: { top: "42%", duration: "3.6s", delay: "0.2s" },
    float: { duration: "7.5s", delay: "1.4s" },
    veil: 0.88,
    art: (
      <>
        <rect x="4" y="1" width="8" height="2" fill="#3a2c44" />
        <rect x="2" y="3" width="12" height="2" fill="#3a2c44" />
        <rect x="1" y="5" width="14" height="6" fill="#3a2c44" />
        <rect x="2" y="11" width="12" height="2" fill="#3a2c44" />
        <rect x="4" y="13" width="8" height="2" fill="#3a2c44" />
        <rect x="5" y="3" width="5" height="1" fill="#c9a884" opacity="0.45" />
        <rect x="3" y="6" width="1" height="3" fill="#c9a884" opacity="0.45" />
        <rect x="9" y="12" width="4" height="1" fill="#c9a884" opacity="0.3" />
        <rect x="6" y="6" width="4" height="4" fill="#b23a3a" />
        <rect x="7" y="7" width="2" height="2" fill="#0c0c0f" />
      </>
    ),
  },
  {
    name: "Video Games",
    line: "Worlds you lived in",
    spinesLeft:
      "#0c0c0f 0 2px, #2a3550 2px 22px, #0c0c0f 22px 24px, #5b2b2e 24px 42px, #0c0c0f 42px 44px, #5a4520 44px 66px, #0c0c0f 66px 68px, #3a2c44 68px 88px, #0c0c0f 88px 90px, #4a3b28 90px 112px, #0c0c0f 112px 114px, #243a2f 114px 134px, #0c0c0f 134px 136px",
    spinesRight:
      "#0c0c0f 0 2px, #243a2f 2px 20px, #0c0c0f 20px 22px, #3a2c44 22px 44px, #0c0c0f 44px 46px, #5a4520 46px 66px, #0c0c0f 66px 68px, #2a3550 68px 90px, #0c0c0f 90px 92px, #4a3b28 92px 112px, #0c0c0f 112px 114px, #5b2b2e 114px 136px, #0c0c0f 136px 138px",
    flameLeft: { top: "36%", duration: "3.2s", delay: "0.5s" },
    flameRight: { top: "28%", duration: "2.7s", delay: "1.4s" },
    float: { duration: "8.5s", delay: "0.4s" },
    veil: 0.88,
    art: (
      <>
        <rect x="3" y="2" width="10" height="11" fill="#243a2f" />
        <rect x="3" y="2" width="1" height="1" fill="#0c0c0f" />
        <rect x="12" y="2" width="1" height="1" fill="#0c0c0f" />
        <rect x="5" y="4" width="6" height="5" fill="#f0dcae" />
        <rect x="7" y="5" width="2" height="2" fill="#b23a3a" />
        <rect x="6" y="7" width="4" height="1" fill="#2a3550" />
        <rect x="5" y="10" width="6" height="1" fill="#0c0c0f" />
        <rect x="5" y="12" width="6" height="1" fill="#0c0c0f" />
        <rect x="4" y="13" width="8" height="1" fill="#0c0c0f" />
      </>
    ),
  },
  {
    name: "Books",
    line: "Novels and manga, spines cracked from rereading",
    spinesLeft:
      "#0c0c0f 0 2px, #5a4520 2px 24px, #0c0c0f 24px 26px, #3a2c44 26px 44px, #0c0c0f 44px 46px, #4a3b28 46px 68px, #0c0c0f 68px 70px, #5b2b2e 70px 90px, #0c0c0f 90px 92px, #2a3550 92px 114px, #0c0c0f 114px 116px, #243a2f 116px 136px, #0c0c0f 136px 138px",
    spinesRight:
      "#0c0c0f 0 2px, #4a3b28 2px 22px, #0c0c0f 22px 24px, #5b2b2e 24px 46px, #0c0c0f 46px 48px, #243a2f 48px 68px, #0c0c0f 68px 70px, #5a4520 70px 92px, #0c0c0f 92px 94px, #3a2c44 94px 114px, #0c0c0f 114px 116px, #2a3550 116px 138px, #0c0c0f 138px 140px",
    flameLeft: { top: "32%", duration: "3s", delay: "0.7s" },
    flameRight: { top: "38%", duration: "2.5s", delay: "1s" },
    float: { duration: "7.2s", delay: "1.1s" },
    veil: 0.88,
    art: (
      <>
        <rect x="3" y="2" width="9" height="12" fill="#b23a3a" />
        <rect x="3" y="2" width="1" height="12" fill="#5b2b2e" />
        <rect x="5" y="4" width="6" height="1" fill="#f0dcae" />
        <rect x="5" y="6" width="6" height="1" fill="#f0dcae" />
        <rect x="12" y="3" width="1" height="10" fill="#cebf9f" />
      </>
    ),
  },
];

// Dust motes drifting up through the candlelight.
const MOTES = [
  { left: "9%", bottom: "5%", duration: "14s", delay: "0s" },
  { left: "92%", bottom: "42%", duration: "18s", delay: "1.7s" },
  { left: "75%", bottom: "24%", duration: "22s", delay: "3.4s" },
  { left: "58%", bottom: "6%", duration: "26s", delay: "5.1s" },
  { left: "41%", bottom: "43%", duration: "14s", delay: "6.8s" },
  { left: "24%", bottom: "25%", duration: "18s", delay: "8.5s" },
  { left: "7%", bottom: "52%", duration: "22s", delay: "10.2s" },
  { left: "90%", bottom: "34%", duration: "26s", delay: "11.9s" },
];

function revealAt(ms: number): React.CSSProperties {
  return { "--reveal-delay": `${ms}ms` } as React.CSSProperties;
}

function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v));
}

function BayWall({
  side,
  spines,
  flame,
}: {
  side: "left" | "right";
  spines: string;
  flame: Flame;
}) {
  const isLeft = side === "left";
  return (
    <div
      className="dolly-wall"
      style={
        {
          [isLeft ? "left" : "right"]: "-4vw",
          transformOrigin: `${side} center`,
          transform: `rotateY(${isLeft ? 56 : -56}deg)`,
          "--spines": `repeating-linear-gradient(90deg, ${spines})`,
        } as React.CSSProperties
      }
    >
      <span
        className="dolly-flame"
        style={
          {
            [isLeft ? "right" : "left"]: "8%",
            top: flame.top,
            animationDuration: flame.duration,
            animationDelay: flame.delay,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

export function Landing() {
  const trackRef = useRef<HTMLElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const finaleRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLDivElement>(null);
  const bayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const veilRefs = useRef<(HTMLDivElement | null)[]>([]);
  const artRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    // Reduced motion: CSS keeps the track at one screen and the camera
    // parked at the mouth of the corridor. Nothing to drive.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    track.style.height = `${TRACK_VH}vh`;

    let target = 0;
    let cur = 0;
    let raf = 0;
    let running = false;

    const measure = () => {
      const rect = track.getBoundingClientRect();
      const usable = rect.height - window.innerHeight;
      target = usable > 0 ? clamp(-rect.top / usable, 0, 1) : 0;
    };

    const render = () => {
      const camZ = cur * CAMERA_END;
      const sway = Math.sin(cur * Math.PI * 2.5) * 14; // handheld drift

      if (worldRef.current) {
        worldRef.current.style.transform = `translate3d(${(-sway).toFixed(2)}px, 0, ${camZ.toFixed(1)}px) rotateY(${(sway * 0.04).toFixed(3)}deg)`;
      }
      const hero = heroRef.current;
      if (hero) {
        const o = clamp(1 - cur * 6, 0, 1);
        hero.style.opacity = o.toFixed(3);
        hero.style.transform = `translateY(${(-cur * 320).toFixed(1)}px)`;
        // visibility, not just pointer-events, so faded-out links also
        // leave the tab order.
        hero.style.visibility = o < 0.02 ? "hidden" : "visible";
        hero.style.pointerEvents = o < 0.1 ? "none" : "auto";
      }
      if (hintRef.current) {
        hintRef.current.style.opacity = clamp(1 - cur * 30, 0, 1).toFixed(3);
      }
      // The finale rises out of the dark over the last stretch.
      const finaleT = clamp((cur - 0.86) / 0.11, 0, 1);
      const finale = finaleRef.current;
      if (finale) {
        finale.style.opacity = finaleT.toFixed(3);
        finale.style.transform = `translateY(${((1 - finaleT) * 40).toFixed(1)}px)`;
        finale.style.visibility = finaleT > 0.01 ? "visible" : "hidden";
        finale.style.pointerEvents = finaleT > 0.5 ? "auto" : "none";
      }
      const skip = skipRef.current;
      if (skip) {
        const so = clamp((0.92 - cur) * 12, 0, 1); // gone as the walk ends
        skip.style.opacity = so.toFixed(3);
        skip.style.pointerEvents = so < 0.2 ? "none" : "auto";
      }

      for (let i = 0; i < BAYS.length; i++) {
        const d = BAY_DEPTHS[i] + camZ; // 0 = at camera; negative = ahead
        const bay = bayRefs.current[i];
        const veil = veilRefs.current[i];
        const art = artRefs.current[i];
        const dot = dotRefs.current[i];
        if (bay) {
          // Bays fade once they pass behind the camera.
          const base = d > 260 ? clamp(1 - (d - 260) / 240, 0, 1) : 1;
          bay.style.opacity = (base * (1 - finaleT)).toFixed(3);
        }
        if (veil) {
          veil.style.opacity = clamp((-d - 350) / 2400, 0, 0.88).toFixed(3);
        }
        const lit = Math.abs(d + 120) < 480;
        if (dot) {
          dot.style.background = lit ? "#f0dcae" : "rgba(240,220,174,0.25)";
          dot.style.transform = lit ? "scale(1.4)" : "scale(1)";
        }
        if (art) {
          // Gate: artifacts stay hidden until the hero copy has begun
          // to fade, so the headline never fights the scene.
          const gate = clamp((cur - 0.05) * 14, 0, 1);
          const k = clamp(1 - Math.abs(d + 200) / 700, 0, 1);
          art.style.opacity = (gate * (0.1 + 0.9 * k) * (1 - finaleT)).toFixed(3);
        }
      }
    };

    const tick = () => {
      measure();
      const delta = target - cur;
      if (Math.abs(delta) < 0.0002) {
        // Settled: paint the exact final frame and go idle. No JS
        // runs again until the next scroll or resize wakes the loop —
        // an always-on RAF writing two dozen styles per frame is what
        // makes an idle page feel heavy.
        cur = target;
        render();
        running = false;
        return;
      }
      // Damped follow: the camera glides after the scrollbar.
      cur += delta * 0.09;
      render();
      raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake, { passive: true });
    wake();
    return () => {
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
      cancelAnimationFrame(raf);
      track.style.height = "";
    };
  }, []);

  const skipToEnd = () => {
    const track = trackRef.current;
    if (!track) return;
    window.scrollTo({
      top: track.offsetTop + track.offsetHeight - window.innerHeight + 1,
      behavior: "auto",
    });
  };

  return (
    <div>
      <section ref={trackRef} className="dolly-track relative">
        <div className="dolly-viewport">
          {/* The 3D world: five shelf bays receding into candlelight. */}
          <div
            ref={worldRef}
            className="dolly-world pointer-events-none"
            aria-hidden="true"
            data-testid="dolly-world"
          >
            <div className="dolly-floor" />
            <div className="dolly-ceiling" />
            <div className="dolly-hearth">
              <div className="dolly-hearth-glow" />
            </div>

            {BAYS.map((bay, i) => (
              <div
                key={bay.name}
                ref={(el) => {
                  bayRefs.current[i] = el;
                }}
                className="absolute inset-0"
                style={{ transform: `translateZ(${BAY_DEPTHS[i]}px)` }}
              >
                <BayWall side="left" spines={bay.spinesLeft} flame={bay.flameLeft} />
                <BayWall side="right" spines={bay.spinesRight} flame={bay.flameRight} />
                <div
                  ref={(el) => {
                    artRefs.current[i] = el;
                  }}
                  className="dolly-art"
                >
                  <div
                    className="dolly-art-float"
                    style={{
                      animationDuration: bay.float.duration,
                      animationDelay: bay.float.delay,
                    }}
                  >
                    <div className="dolly-art-frame">
                      <svg
                        viewBox="0 0 16 16"
                        shapeRendering="crispEdges"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {bay.art}
                      </svg>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 px-6 text-center">
                    <span className="dolly-text-dim font-label text-[15px] tracking-[0.25em]">
                      0{i + 1} / 05
                    </span>
                    <span className="dolly-title font-display text-[clamp(44px,6vw,84px)]">
                      {bay.name}
                    </span>
                    <span className="dolly-text-warm max-w-[34ch] text-[clamp(17px,1.6vw,22px)]">
                      {bay.line}
                    </span>
                  </div>
                </div>
                <div
                  ref={(el) => {
                    veilRefs.current[i] = el;
                  }}
                  className="dolly-veil"
                  style={{ opacity: bay.veil }}
                />
              </div>
            ))}
          </div>

          {/* Atmosphere: light shafts + dust motes, fixed to the camera. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div
              className="dolly-shaft"
              style={{
                top: "-18%",
                left: "14%",
                width: "34%",
                height: "92%",
                transform: "rotate(14deg)",
                animationDuration: "11s",
              }}
            />
            <div
              className="dolly-shaft"
              style={{
                top: "-14%",
                right: "10%",
                width: "26%",
                height: "80%",
                transform: "rotate(-11deg)",
                animationDuration: "14s",
                animationDelay: "3s",
              }}
            />
            {MOTES.map((mote, i) => (
              <span
                key={i}
                className="dolly-mote"
                style={{
                  left: mote.left,
                  bottom: mote.bottom,
                  animationDuration: mote.duration,
                  animationDelay: mote.delay,
                }}
              />
            ))}
          </div>

          {/* Vignette pooling the hall in darkness. */}
          <div aria-hidden="true" className="dolly-vignette" />

          {/* Hero copy. */}
          <div
            ref={heroRef}
            className="absolute inset-0 z-[5] flex flex-col items-center justify-center px-6 text-center"
          >
            <p
              className="dolly-text-warm reveal font-label text-xs uppercase tracking-[0.3em]"
              style={revealAt(0)}
            >
              Your taste, on one page
            </p>
            <h1
              className="dolly-hero-title reveal mt-8 max-w-[16ch] font-display text-[clamp(42px,7.6vw,100px)] leading-[0.95] tracking-tight"
              style={revealAt(80)}
            >
              Five favorites. Five shelves. One profile.
            </h1>
            <p
              className="reveal mx-auto mt-8 max-w-2xl text-[17px] leading-[1.65] text-ink-muted"
              style={revealAt(160)}
            >
              mediapage is where your whole taste lives. Pin the five works you
              would defend forever in each shelf, write the recommendation only
              you could write, and follow the people whose shelves you trust.
            </p>
            <div
              className="reveal mt-12 flex flex-wrap items-center justify-center gap-4"
              style={revealAt(240)}
            >
              <Link href="/login" className="dolly-cta-primary">
                Start your shelf
              </Link>
              <Link href="/library" className="dolly-cta-ghost">
                Browse the library
              </Link>
            </div>
          </div>

          {/* Finale: the end of the walk. */}
          <div
            ref={finaleRef}
            className="pointer-events-none invisible absolute inset-0 z-[5] flex flex-col items-center justify-center px-6 text-center opacity-0"
          >
            <div aria-hidden="true" className="dolly-finale-glow" />
            <span aria-hidden="true" className="dolly-flame dolly-flame-lg relative" />
            <p className="dolly-text-warm relative mt-9 font-label text-xs uppercase tracking-[0.3em]">
              End of the stacks
            </p>
            <h2 className="dolly-hero-title relative mt-6 max-w-[14ch] font-display text-[clamp(36px,5.6vw,76px)] leading-none tracking-tight">
              The next shelf is yours to fill.
            </h2>
            <p className="relative mx-auto mt-6 max-w-[34rem] text-base leading-[1.65] text-ink-muted">
              Five shelves, five favorites each. Twenty-five works that say who
              you are.
            </p>
            <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/login" className="dolly-cta-primary">
                Start your shelf
              </Link>
              <a href="#shelves-heading" className="dolly-cta-quiet">
                See the five shelves ↓
              </a>
            </div>
          </div>

          {/* Scroll hint. */}
          <div
            ref={hintRef}
            aria-hidden="true"
            className="dolly-rm-hide pointer-events-none absolute inset-x-0 bottom-[26px] z-[6] flex flex-col items-center gap-2"
          >
            <span className="dolly-text-dim font-label text-[11px] uppercase tracking-[0.25em]">
              Scroll — walk the stacks
            </span>
            <span className="dolly-hint-arrow dolly-text-dim text-base leading-none">
              ↓
            </span>
          </div>

          {/* Skip the walk: quiet corner button straight to the end. */}
          <div ref={skipRef} className="dolly-rm-hide absolute bottom-5 right-5 z-[7]">
            <button
              type="button"
              onClick={skipToEnd}
              aria-label="Skip to the five shelves"
              title="Skip to the five shelves"
              className="dolly-skip"
            >
              ↓
            </button>
          </div>

          {/* Bay progress rail. */}
          <div
            aria-hidden="true"
            className="dolly-rm-hide pointer-events-none absolute right-5 top-1/2 z-[6] flex -translate-y-1/2 flex-col gap-3"
          >
            {BAYS.map((bay, i) => (
              <span
                key={bay.name}
                ref={(el) => {
                  dotRefs.current[i] = el;
                }}
                className="dolly-dot"
              />
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="shelves-heading"
        className="mx-auto w-full max-w-6xl px-6 pb-28 pt-16"
      >
        <h2
          id="shelves-heading"
          className="dolly-text-dim reveal font-label text-xs uppercase tracking-[0.3em]"
          style={revealAt(0)}
        >
          The five shelves
        </h2>
        <ol className="mt-6">
          {BAYS.map((bay, i) => (
            <li
              key={bay.name}
              className="dolly-index-row reveal flex items-center gap-6 py-6"
              style={revealAt(60 + i * 90)}
            >
              <span
                className="dolly-text-dim w-10 shrink-0 font-label text-xs"
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-display text-3xl tracking-tight sm:text-4xl">
                {bay.name}
              </span>
              <span className="ml-auto hidden max-w-64 text-right text-sm text-ink-muted sm:block">
                {bay.line}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
