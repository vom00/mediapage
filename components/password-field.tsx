"use client";

// Adapted from Rare UI (https://rareui.com), Copyright (c) 2026 Swami Malode. MIT + Commons Clause + Attribution.

import { useId, useRef, useState } from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";

const LID_OPEN = { top: 5.5, bottom: 18.5 };
const LID_CLOSED = { top: 17, bottom: 17 };
const LASHES = [
  "M4.4 14.6 3 16.4",
  "M9 16.6 8.5 19",
  "M15 16.6l.5 2.4",
  "M19.6 14.6l1.4 1.8",
];

const INSTANT: Transition = { duration: 0 };
const LID_SPRING: Transition = { type: "spring", stiffness: 500, damping: 34 };

const corner = (y: number) => 12 + (y - 12) * 0.64;

const eyePath = ({ top, bottom }: { top: number; bottom: number }) =>
  `M2 12C4 ${corner(top)} 7.5 ${top} 12 ${top}C16.5 ${top} 20 ${corner(top)} 22 12C20 ${corner(bottom)} 16.5 ${bottom} 12 ${bottom}C7.5 ${bottom} 4 ${corner(bottom)} 2 12Z`;

function Eye({ open, reduceMotion }: { open: boolean; reduceMotion: boolean }) {
  const clipId = useId();
  const lid = { d: eyePath(open ? LID_OPEN : LID_CLOSED) };
  const transition = reduceMotion ? INSTANT : LID_SPRING;

  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5 overflow-visible"
    >
      <clipPath id={clipId}>
        <motion.path initial={false} animate={lid} transition={transition} />
      </clipPath>
      <circle cx={12} cy={12} r={3} clipPath={`url(#${clipId})`} />
      <motion.path initial={false} animate={lid} transition={transition} />
      {LASHES.map((d) => (
        <motion.path
          key={d}
          d={d}
          initial={false}
          animate={{ pathLength: open ? 0 : 1, opacity: open ? 0 : 1 }}
          transition={
            reduceMotion ? INSTANT : { duration: 0.2, delay: open ? 0 : 0.08 }
          }
        />
      ))}
    </svg>
  );
}

export function PasswordField({
  className,
  ...props
}: Omit<React.ComponentPropsWithoutRef<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion() ?? false;

  function toggle() {
    const el = input.current;
    const start = el?.selectionStart ?? null;
    const end = el?.selectionEnd ?? null;
    setVisible((v) => !v);
    // switching the input type can drop the selection in some browsers
    requestAnimationFrame(() => {
      if (el && start !== null && end !== null && document.activeElement === el)
        el.setSelectionRange(start, end);
    });
  }

  return (
    <div className="relative">
      <input
        {...props}
        ref={input}
        type={visible ? "text" : "password"}
        // Edge draws its own reveal eye inside password inputs; ours replaces it.
        className={`${className ?? ""} pr-12 [&::-ms-reveal]:hidden`}
      />
      <button
        type="button"
        aria-label="Show password"
        aria-pressed={visible}
        // keep focus (and the caret) in the input when it is clicked
        onPointerDown={(event) => event.preventDefault()}
        onClick={toggle}
        className="absolute bottom-0 right-0 grid h-[46px] w-11 place-items-center rounded-full text-ink-muted transition-colors hover:text-ink"
      >
        <Eye open={visible} reduceMotion={reduceMotion} />
      </button>
    </div>
  );
}
