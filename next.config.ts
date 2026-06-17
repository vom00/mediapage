import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next allows one dev server per dist dir. E2E runs its own dev
  // instance on port 3100 with NEXT_DIST_DIR=.next-e2e so it can
  // coexist with the developer preview on 3000.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  images: {
    // Serve cover art unoptimized: the browser loads each poster straight
    // from its source CDN (TMDB, IGDB, Open Library, …) instead of routing
    // through Next/Vercel Image Optimization. That keeps covers off
    // Vercel's Hobby image-optimization quota — which, once exhausted,
    // makes optimized remote images fail to load — and off Vercel
    // bandwidth entirely. The sources already return CDN-sized thumbnails,
    // so there is little to gain from re-optimizing them.
    unoptimized: true,
    // The optimizer refuses loopback hosts by default. Development
    // and E2E load covers and avatars from local emulators/fixture
    // servers, so allow it outside production builds only.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      // Firebase Storage (legacy avatars) — production and emulator —
      // plus local fixture servers used by hermetic E2E runs (any port).
      // New avatars are inlined as data URLs and need no host here.
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "http", hostname: "localhost" },
      // TMDB poster CDN (movies + live-action TV).
      { protocol: "https", hostname: "image.tmdb.org" },
      // Open Library book covers.
      { protocol: "https", hostname: "**.openlibrary.org" },
      // AniList (anime/manga) + MyAnimeList/Jikan cover CDNs.
      { protocol: "https", hostname: "**.anilist.co" },
      { protocol: "https", hostname: "**.myanimelist.net" },
      // Deezer artist images (music shelf).
      { protocol: "https", hostname: "**.dzcdn.net" },
      // Steam library box art (video games shelf, keyless fallback).
      { protocol: "https", hostname: "**.steamstatic.com" },
      // IGDB cover art (video games shelf, "every game" source).
      { protocol: "https", hostname: "images.igdb.com" },
    ],
  },
};

export default nextConfig;
