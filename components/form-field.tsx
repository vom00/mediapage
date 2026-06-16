// Shared monochrome form styling. Labels are real labels, errors
// render adjacent to their field and are announced politely.

export const inputClass =
  "w-full min-h-11 border border-edge bg-bg px-4 py-2 text-ink placeholder:text-ink-muted/60 transition-colors duration-200 focus:border-glow";

export const labelClass =
  "block font-label text-xs uppercase tracking-[0.2em] text-ink-muted";

// All action buttons are liquid-glass pills, matching the homepage
// CTAs and people-search follow buttons. Primary is bolder; secondary
// is lighter weight but the same glass so the set stays consistent.
export const buttonClass =
  "liquid-glass flex min-h-11 w-full items-center justify-center rounded-full px-6 font-medium text-ink transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

export const ghostButtonClass =
  "liquid-glass flex min-h-11 items-center justify-center rounded-full px-6 text-sm text-ink transition-opacity duration-200 hover:opacity-90 disabled:opacity-50";

export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="mt-2 border-l-2 border-glow pl-3 text-sm text-ink">
      {message}
    </p>
  );
}
