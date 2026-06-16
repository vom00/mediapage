// Compact relative timestamps for recommendations and comments.

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const elapsedSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (elapsedSeconds < MINUTE) return "just now";
  if (elapsedSeconds < HOUR) {
    return `${Math.floor(elapsedSeconds / MINUTE)}m ago`;
  }
  if (elapsedSeconds < DAY) {
    return `${Math.floor(elapsedSeconds / HOUR)}h ago`;
  }
  if (elapsedSeconds < WEEK) {
    return `${Math.floor(elapsedSeconds / DAY)}d ago`;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
