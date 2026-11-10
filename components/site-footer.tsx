const LINK = "link";

// The data attributions the sources ask for, set small beside the
// wordmark.
export function SiteFooter() {
  return (
    <footer className="border-t border-edge bg-bg">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] md:gap-16 md:py-16">
        <p className="font-wordmark text-2xl leading-none tracking-tight text-ink">
          mediapage
        </p>

        <div className="flex flex-col gap-3 text-sm leading-relaxed text-ink-muted">
          <p>
            This product uses the TMDB API but is not endorsed or certified by
            TMDB. Film and TV data provided by{" "}
            <a
              href="https://www.themoviedb.org"
              className={LINK}
              rel="noreferrer"
              target="_blank"
            >
              TMDB
            </a>
            .
          </p>
          <p>
            Game data and box art from{" "}
            <a
              href="https://www.igdb.com"
              className={LINK}
              rel="noreferrer"
              target="_blank"
            >
              IGDB
            </a>
            , with{" "}
            <a
              href="https://store.steampowered.com"
              className={LINK}
              rel="noreferrer"
              target="_blank"
            >
              Steam
            </a>{" "}
            as a fallback.
          </p>
          <p>
            Anime and manga data from{" "}
            <a
              href="https://anilist.co"
              className={LINK}
              rel="noreferrer"
              target="_blank"
            >
              AniList
            </a>
            , with{" "}
            <a
              href="https://myanimelist.net"
              className={LINK}
              rel="noreferrer"
              target="_blank"
            >
              MyAnimeList
            </a>{" "}
            as a fallback. Book data from{" "}
            <a
              href="https://openlibrary.org"
              className={LINK}
              rel="noreferrer"
              target="_blank"
            >
              Open Library
            </a>
            . Music data from{" "}
            <a
              href="https://www.deezer.com"
              className={LINK}
              rel="noreferrer"
              target="_blank"
            >
              Deezer
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
