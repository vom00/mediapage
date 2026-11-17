"use client";

// Adapted from Rare UI (https://rareui.com), Copyright (c) 2026 Swami Malode. MIT + Commons Clause + Attribution.

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

// 0-9 plus a second 0, so rolling 9 -> 0 lands on an identical face.
const WHEEL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
const ROLL = { type: "spring", visualDuration: 0.5, bounce: 0 } as const;

const mod = (n: number, m: number) => ((n % m) + m) % m;

// Digits of a non-negative integer, most significant first.
export function digitsOf(value: number): number[] {
  const n = Number.isFinite(value)
    ? Math.min(Math.max(0, Math.trunc(value)), Number.MAX_SAFE_INTEGER)
    : 0;
  return Array.from(String(n), Number);
}

// Unwrapped wheel position (in faces) that shows `digit`, reached by turning
// the way the value moved: up for +1, down for -1.
export function rollTarget(at: number, digit: number, dir: 1 | -1): number {
  const from = dir > 0 ? Math.ceil(at) : Math.floor(at);
  return dir > 0 ? from + mod(digit - from, 10) : from - mod(from - digit, 10);
}

function Column({
  digit,
  from,
  dir,
  reduced,
}: {
  digit: number;
  from: number;
  dir: 1 | -1;
  reduced: boolean;
}) {
  const pos = useMotionValue(from);
  const goal = useRef(from);
  const y = useTransform(pos, (p) => `${(-mod(p, 10) * 100) / WHEEL.length}%`);

  useEffect(() => {
    if (reduced) {
      goal.current = digit;
      pos.set(digit);
      return;
    }
    // A direction flip alone must not send a moving wheel the long way round.
    if (mod(goal.current, 10) !== digit) {
      goal.current = rollTarget(pos.get(), digit, dir);
    }
    const roll = animate(pos, goal.current, ROLL);
    return () => roll.stop();
  }, [digit, dir, reduced, pos]);

  // The faces are CSS content, so the column adds nothing to textContent.
  return (
    <span className="relative inline-block [clip-path:inset(0)]">
      <span className="invisible before:content-['0']" />
      <motion.span
        style={{ y, height: `${WHEEL.length * 100}%` }}
        className="absolute inset-x-0 top-0 flex flex-col"
      >
        {WHEEL.map((face, i) => (
          <span
            key={i}
            data-d={face}
            className="flex flex-1 items-center justify-center before:content-[attr(data-d)]"
          />
        ))}
      </motion.span>
    </span>
  );
}

export function RollingNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const digits = digitsOf(value);

  const [previous, setPrevious] = useState(value);
  const [dir, setDir] = useState<1 | -1>(1);
  if (previous !== value) {
    setDir(value > previous ? 1 : -1);
    setPrevious(value);
  }

  // Places present at mount rest on their digit; places added later roll in from 0.
  const [seed] = useState(digits);

  return (
    <span className={`inline-flex tabular-nums${className ? ` ${className}` : ""}`}>
      <span className="sr-only">{digits.join("")}</span>
      <span aria-hidden="true" className="inline-flex">
        {digits.map((digit, i) => {
          const place = digits.length - 1 - i;
          return (
            <Column
              key={place}
              digit={digit}
              from={reduced ? digit : (seed[seed.length - 1 - place] ?? 0)}
              dir={dir}
              reduced={reduced}
            />
          );
        })}
      </span>
    </span>
  );
}
