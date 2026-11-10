import type { Metadata } from "next";
import { Geist, Geist_Mono, Mochiy_Pop_One } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { QueryProvider } from "@/components/query-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

// One family for display and text (Geist, set at 500 for headlines),
// and its mono for figures and metadata.
const sans = Geist({
  variable: "--font-geist-var",
  subsets: ["latin"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-label-var",
  subsets: ["latin"],
  display: "swap",
});

// Logo wordmark font. The brief requested NIS-JTC-Win-M9
// (TT-JTCウインM9P), a commercial Japanese display face from nisfont
// that we can't legally bundle for free — Mochiy Pop One is the
// closest free stand-in: the same heavy, friendly Japanese "pop
// gothic" character, with full Latin glyphs. To use the licensed
// font instead, drop its file in app/fonts and swap this back to
// next/font/local pointing at it.
const wordmark = Mochiy_Pop_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-wordmark-var",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "mediapage",
    template: "%s · mediapage",
  },
  description:
    "A profile for everything you love. Five favorites up front across movies, shows, music, games, and books.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${wordmark.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-body">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <AuthProvider>
          <QueryProvider>
            <SiteNav />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
