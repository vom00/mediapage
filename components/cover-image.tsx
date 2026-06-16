"use client";

import Image from "next/image";
import { useState } from "react";
import { PLACEHOLDER_COVER } from "@/lib/sources/types";

// Cover art with a guaranteed fallback: some sources (notably the
// Cover Art Archive) 404 for items without artwork, so a load error
// swaps in the monochrome placeholder.
export function CoverImage({ src, alt }: { src: string; alt: string }) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [prevSrc, setPrevSrc] = useState(src);

  // Reset the fallback when this instance is reused with a new item.
  if (src !== prevSrc) {
    setPrevSrc(src);
    setCurrentSrc(src);
  }

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill
      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
      className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      onError={() => setCurrentSrc(PLACEHOLDER_COVER)}
    />
  );
}
