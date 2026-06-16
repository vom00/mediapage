// Profile picture renderer. Avatars are stored as small data URLs in
// Firestore (no paid object storage), so they're rendered with a
// plain <img>: next/image optimization is pointless for a tiny,
// fixed-size image and does not accept data: URLs as a source.
// Falls back to the first initial when there is no picture.
//
// `className` is applied to both the image and the initial fallback,
// so callers pass sizing/shape there (e.g. "size-10 rounded-full
// border border-edge bg-surface"). object-cover and the fallback's
// centering/typography are baked in.

export function Avatar({
  src,
  name,
  alt = "",
  className = "",
}: {
  src?: string | null;
  name: string;
  alt?: string;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- data: URL avatar; next/image cannot optimize or render these
    return <img src={src} alt={alt} className={`object-cover ${className}`} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`flex items-center justify-center font-display italic text-ink-muted ${className}`}
    >
      {name.slice(0, 1)}
    </span>
  );
}
