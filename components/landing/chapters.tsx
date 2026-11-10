"use client";

import { Pause, Play } from "lucide-react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";

// The page's pinned moment: three steps open one at a time while the
// section holds still with position: sticky and the page scrolls
// natively. The steps work as an accordion: only the open one shows its
// body, so the column carries no empty room. Beside them one frame shows
// the product's own interface for the open step and crossfades as the
// next opens. The scrub follows the scrollbar, so it runs backwards on
// the way up. Two of the frames hold a short loop (a cover changing
// places, a Follow being pressed); each has a pause button.
//
// Everything rests visible and stacked without script, under reduced
// motion and on phones: the pinned layout (data-pinned) is only switched
// on by the effect below, and only where the viewport suits it.

const PIN_QUERY =
  "(min-width: 900px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)";
const LOOP_QUERY = "(prefers-reduced-motion: no-preference)";

/** 0..1: how fully step i is open at scroll progress p. Steps own a third each. */
function openness(p: number, i: number) {
  let d = p * 3 - (i + 0.5);
  // The first and last step stay open at their own end of the scroll.
  if (i === 0 && d < 0) d = 0;
  if (i === 2 && d > 0) d = 0;
  return Math.min(1, Math.max(0, (0.62 - Math.abs(d)) / 0.24));
}

const hiddenBelow = (o: number) => (o < 0.01 ? "hidden" : "visible");

// Public-domain works only, set as flat typographic covers.
type Cover = { title: string; year: string; bg: string; ink: string };

const COVERS: Cover[] = [
  { title: "Metropolis", year: "1927", bg: "#263b4a", ink: "#f2f2f2" },
  { title: "Nosferatu", year: "1922", bg: "#1f3a2e", ink: "#e9efdf" },
  { title: "The Cabinet of Dr. Caligari", year: "1920", bg: "#cdbb8c", ink: "#1a1a1a" },
  { title: "The General", year: "1926", bg: "#8a3b2e", ink: "#f4ece4" },
  { title: "A Trip to the Moon", year: "1902", bg: "#e6e2d6", ink: "#1a1a1a" },
];

function CoverBlock({ cover, className = "" }: { cover: Cover; className?: string }) {
  return (
    <span
      className={`lp-cv ${className}`}
      style={{ "--cv-bg": cover.bg, "--cv-ink": cover.ink } as React.CSSProperties}
    >
      <span className="lp-cv-in">
        <span className="lp-cv-title">{cover.title}</span>
        <span className="lp-cv-year font-label">{cover.year}</span>
      </span>
    </span>
  );
}

const PEOPLE = [
  { name: "Tamsin Reyes", handle: "tamsin", following: false },
  { name: "Oren Vale", handle: "oren", following: true },
  { name: "Hollis Kane", handle: "hollis", following: false },
];

function PauseButton({ paused, onToggle }: { paused: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="btn lp-pause"
      aria-label={paused ? "Play animation" : "Pause animation"}
      onClick={onToggle}
    >
      {paused ? (
        <Play aria-hidden="true" size={14} strokeWidth={2} />
      ) : (
        <Pause aria-hidden="true" size={14} strokeWidth={2} />
      )}
    </button>
  );
}

type Step = { title: string; body: string };

const STEPS: Step[] = [
  {
    title: "Put five favorites up front",
    body: "Each shelf shows your first five and keeps the rest behind See all. Search the library, add a favorite, and reorder whenever you change your mind.",
  },
  {
    title: "Write why one of them matters",
    body: "Pin a short note to any favorite. Your followers see it in their feed, and you choose whether they can comment.",
  },
  {
    title: "Follow people whose shelves you trust",
    body: "Follow people whose shelves you would raid. Their recommendations show up in your feed.",
  },
];

/** Step i reads its openness (--k) and its body's height (--h) from the
 *  section, which carries one of each per step. */
function StepText({ step, index }: { step: Step; index: number }) {
  return (
    <div
      className="lp-chap-text"
      style={
        {
          "--row": index + 2,
          "--k": `var(--k${index}, 0)`,
          "--h": `var(--h${index}, 6rem)`,
        } as React.CSSProperties
      }
    >
      <h3 className="lp-chap-title">{step.title}</h3>
      <div className="lp-chap-fold">
        <p className="lp-chap-body">{step.body}</p>
      </div>
    </div>
  );
}

function Frame({
  k,
  pinned,
  label,
  children,
  extra,
}: {
  k: MotionValue<number>;
  pinned: boolean;
  label: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  const visibility = useTransform(k, hiddenBelow);
  return (
    <motion.div
      className="lp-frame card"
      data-frame={label}
      style={pinned ? { opacity: k, visibility } : undefined}
    >
      <div className="lp-frame-in">
        <div className="lp-pic" aria-hidden="true" inert>
          {children}
        </div>
        {extra}
      </div>
    </motion.div>
  );
}

export function Chapters() {
  const ref = useRef<HTMLElement>(null);
  const [pinned, setPinned] = useState(false);
  const [loop, setLoop] = useState(false);
  const [paused, setPaused] = useState(false);

  const { scrollYProgress } = useScroll({
    target: ref,
    // The section sticks 4rem down, under the sticky nav.
    offset: ["start 64px", "end end"],
  });
  const k0 = useTransform(scrollYProgress, (p) => openness(p, 0));
  const k1 = useTransform(scrollYProgress, (p) => openness(p, 1));
  const k2 = useTransform(scrollYProgress, (p) => openness(p, 2));
  const ks = [k0, k1, k2];

  useEffect(() => {
    const pin = window.matchMedia(PIN_QUERY);
    const loopMq = window.matchMedia(LOOP_QUERY);
    const sync = () => {
      setPinned(pin.matches);
      setLoop(loopMq.matches);
    };
    sync();
    pin.addEventListener("change", sync);
    loopMq.addEventListener("change", sync);
    return () => {
      pin.removeEventListener("change", sync);
      loopMq.removeEventListener("change", sync);
    };
  }, []);

  // Each fold opens to its own body's height (--h0..2). The tallest
  // (--h-max) lets the stylesheet keep the column one height while the
  // steps trade places.
  useEffect(() => {
    const section = ref.current;
    if (!pinned || !section) return;
    const bodies = [...section.querySelectorAll<HTMLElement>(".lp-chap-body")];
    const fit = () => {
      const heights = bodies.map((b) => b.offsetHeight);
      heights.forEach((h, i) => section.style.setProperty(`--h${i}`, `${h}px`));
      section.style.setProperty("--h-max", `${Math.max(...heights)}px`);
    };
    fit();
    const sizes = new ResizeObserver(fit);
    for (const body of bodies) sizes.observe(body);
    return () => {
      sizes.disconnect();
      for (const name of ["--h0", "--h1", "--h2", "--h-max"]) section.style.removeProperty(name);
    };
  }, [pinned]);

  const togglePaused = () => setPaused((v) => !v);

  return (
    <motion.section
      ref={ref}
      aria-labelledby="how-heading"
      className="lp-chap"
      data-pinned={pinned ? "true" : undefined}
      data-loop={loop ? "true" : undefined}
      data-paused={paused ? "true" : undefined}
      style={(pinned ? { "--k0": k0, "--k1": k1, "--k2": k2 } : undefined) as never}
    >
      <div className="lp-chap-pin">
        <div className="lp-chap-body-grid">
          <h2 id="how-heading" className="lp-chap-head">
            How a profile works
          </h2>

          <div className="lp-chap-step">
            <StepText step={STEPS[0]} index={0} />
            <Frame
              k={ks[0]}
              pinned={pinned}
              label="shelf"
              extra={<PauseButton paused={paused} onToggle={togglePaused} />}
            >
              <div className="lp-pic-head">
                Movies
                <span className="chip font-label">{COVERS.length}</span>
              </div>
              <div className="lp-shelf">
                <div className="lp-covers">
                  {COVERS.map((cover, i) => (
                    <CoverBlock
                      key={cover.title}
                      cover={cover}
                      className={i === 3 ? "lp-cv-left" : i === 2 ? "lp-cv-right" : ""}
                    />
                  ))}
                </div>
                <div className="lp-plank" />
              </div>
            </Frame>
          </div>

          <div className="lp-chap-step">
            <StepText step={STEPS[1]} index={1} />
            <Frame k={ks[1]} pinned={pinned} label="note">
              <div className="lp-rec-by">
                <span className="lp-av">T</span>
                <span className="lp-rec-who">
                  <span className="lp-strong">Tamsin Reyes</span>
                  <span className="lp-muted">@tamsin</span>
                </span>
                <span className="lp-muted font-label">2 hours ago</span>
              </div>
              <div className="lp-rec-work">
                <CoverBlock cover={COVERS[1]} className="lp-cv-sm" />
                <span className="lp-rec-meta">
                  <span className="lp-strong">Nosferatu</span>
                  <span className="lp-muted">Movies</span>
                </span>
              </div>
              <p className="lp-rec-note">
                Watch it late, with the lights off. The shadow on the stairs still works a
                hundred years on.
              </p>
            </Frame>
          </div>

          <div className="lp-chap-step">
            <StepText step={STEPS[2]} index={2} />
            <Frame
              k={ks[2]}
              pinned={pinned}
              label="people"
              extra={<PauseButton paused={paused} onToggle={togglePaused} />}
            >
              <div className="lp-pic-head">People</div>
              <ul className="lp-people">
                {PEOPLE.map((p, i) => (
                  <li key={p.handle} className="lp-person">
                    <span className="lp-av">{p.name[0]}</span>
                    <span className="lp-rec-who">
                      <span className="lp-strong">{p.name}</span>
                      <span className="lp-muted">@{p.handle}</span>
                    </span>
                    {/* The first Follow is the one the loop presses. */}
                    <span className={i === 0 ? "lp-follow lp-follow-loop" : "lp-follow"}>
                      {p.following ? (
                        <span className="btn">Following</span>
                      ) : (
                        <>
                          <span className="btn btn-primary lp-follow-off">Follow</span>
                          <span className="btn lp-follow-on">Following</span>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Frame>
          </div>

          <p className="lp-chap-more">
            <a href="#shelves-heading" className="link">
              See the five shelves
            </a>
          </p>
        </div>
      </div>
    </motion.section>
  );
}
