// Shared form vocabulary. Labels are real labels, errors render adjacent
// to their field and are announced politely. The classes below are thin
// names for the primitives in globals.css (.field, .btn) so every form in
// the app reads the same.

export const inputClass = "field";

// 14px, weight 500, sentence case.
export const labelClass = "block text-sm font-medium text-ink";

// One primary button, one plain one.
export const buttonClass = "btn btn-primary w-full";

export const ghostButtonClass = "btn";

// A native file input whose button matches `.btn`.
export const fileInputClass =
  "block w-full min-w-0 text-sm text-ink-muted file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-full file:border-0 file:bg-[color-mix(in_oklab,var(--text)_8%,var(--bg))] file:px-5 file:text-sm file:font-medium file:text-ink file:transition-colors hover:file:bg-[color-mix(in_oklab,var(--text)_14%,var(--bg))]";

export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="mt-2 text-sm text-danger">
      {message}
    </p>
  );
}
