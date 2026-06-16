export function SiteFooter() {
  return (
    <footer className="border-t border-edge bg-bg">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-10 text-sm text-ink-muted">
        <p className="font-label text-xs uppercase tracking-[0.2em]">
          mediapage
        </p>
        <p>
          This product uses the TMDB API but is not endorsed or certified by
          TMDB. Film and TV data provided by{" "}
          <a
            href="https://www.themoviedb.org"
            className="underline underline-offset-4 hover:text-ink"
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
            className="underline underline-offset-4 hover:text-ink"
            rel="noreferrer"
            target="_blank"
          >
            IGDB
          </a>
          , with{" "}
          <a
            href="https://store.steampowered.com"
            className="underline underline-offset-4 hover:text-ink"
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
            className="underline underline-offset-4 hover:text-ink"
            rel="noreferrer"
            target="_blank"
          >
            AniList
          </a>
          , with{" "}
          <a
            href="https://myanimelist.net"
            className="underline underline-offset-4 hover:text-ink"
            rel="noreferrer"
            target="_blank"
          >
            MyAnimeList
          </a>{" "}
          as a fallback. Book data from{" "}
          <a
            href="https://openlibrary.org"
            className="underline underline-offset-4 hover:text-ink"
            rel="noreferrer"
            target="_blank"
          >
            Open Library
          </a>
          . Music data from{" "}
          <a
            href="https://www.deezer.com"
            className="underline underline-offset-4 hover:text-ink"
            rel="noreferrer"
            target="_blank"
          >
            Deezer
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
