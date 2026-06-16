// Local fixture server impersonating every upstream media API for
// hermetic E2E runs: TMDB, AniList (GraphQL), Steam, Open Library,
// and Deezer, plus a tiny image endpoint for cover art.
import { readFileSync } from "node:fs";
import http from "node:http";

const PORT = 4601;
const RESPONSE_DELAY_MS = 600; // long enough for skeleton states to be observable

// A known-good PNG (also used as the E2E avatar fixture).
const PNG = readFileSync(new URL("../fixtures/avatar.png", import.meta.url));

const IMG = (n) => `http://127.0.0.1:${PORT}/img/p${n}.png`;

function tmdbResults(kind, page) {
  const offset = (page - 1) * 20;
  return Array.from({ length: 20 }, (_, i) => {
    const n = offset + i + 1;
    return kind === "movie"
      ? {
          id: 100000 + n,
          title: `Paper Moon ${n}`,
          release_date: `${1960 + (n % 60)}-01-01`,
          poster_path: n % 2 === 0 ? `/p${n}.png` : null,
          overview: `Fixture synopsis for movie number ${n}.`,
          genre_ids: [18],
        }
      : {
          id: 200000 + n,
          name: `Static Channel ${n}`,
          first_air_date: `${1980 + (n % 40)}-01-01`,
          poster_path: n % 2 === 0 ? `/p${n}.png` : null,
          overview: `Fixture synopsis for show number ${n}.`,
          genre_ids: [18],
        };
  });
}

function anilistBody(page, type) {
  const offset = (page - 1) * 20;
  const manga = type === "MANGA";
  return {
    data: {
      Page: {
        pageInfo: { hasNextPage: page < 2 },
        media: Array.from({ length: 20 }, (_, i) => {
          const n = offset + i + 1;
          return manga
            ? {
                id: 700000 + n,
                title: { romaji: `Inked Saga ${n}`, english: null },
                startDate: { year: 1990 + (n % 30) },
                coverImage: { large: n % 2 === 0 ? IMG(n) : null },
                description: `Fixture synopsis for manga number ${n}.`,
                genres: ["Adventure"],
                siteUrl: `https://anilist.co/manga/${700000 + n}`,
                studios: { nodes: [{ name: "Fixture Press" }] },
              }
            : {
                id: 300000 + n,
                title: { romaji: `Mononoke Hour ${n}`, english: null },
                startDate: { year: 1990 + (n % 30) },
                coverImage: { large: n % 2 === 0 ? IMG(n) : null },
                description: `Fixture synopsis for anime number ${n}.<br><i>Spirits.</i>`,
                genres: ["Supernatural"],
                siteUrl: `https://anilist.co/anime/${300000 + n}`,
                studios: { nodes: [{ name: "Fixture Animation" }] },
              };
        }),
      },
    },
  };
}

function steamBody() {
  // storesearch returns a single ranked set with no paging.
  return {
    total: 20,
    items: Array.from({ length: 20 }, (_, i) => {
      const n = i + 1;
      return { type: "app", id: 400000 + n, name: `Pixel Quest ${n}` };
    }),
  };
}

function openLibraryBody(page) {
  const offset = (page - 1) * 20;
  return {
    numFound: 40,
    docs: Array.from({ length: 20 }, (_, i) => {
      const n = offset + i + 1;
      return {
        key: `/works/OL${n}W`,
        title: `Paper Trails ${n}`,
        author_name: ["Fixture Author"],
        first_publish_year: 1900 + n,
        cover_i: n % 2 === 0 ? n : undefined,
      };
    }),
  };
}

function deezerBody(index) {
  return {
    total: 40,
    next:
      index + 20 < 40
        ? `http://127.0.0.1:${PORT}/search/artist?index=${index + 20}`
        : undefined,
    data: Array.from({ length: 20 }, (_, i) => {
      const n = index + i + 1;
      return {
        id: 500000 + n,
        name: `Moon Choir ${n}`,
        link: `https://www.deezer.com/artist/${500000 + n}`,
        picture_xl: n % 2 === 0 ? IMG(n) : "",
        nb_album: n,
      };
    }),
  };
}

function send(res, body) {
  setTimeout(() => {
    res
      .writeHead(200, { "content-type": "application/json" })
      .end(JSON.stringify(body));
  }, RESPONSE_DELAY_MS);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));

  if (url.pathname === "/health") {
    res.writeHead(200).end("ok");
    return;
  }
  if (url.pathname.startsWith("/img/")) {
    res.writeHead(200, { "content-type": "image/png" }).end(PNG);
    return;
  }

  // Cover Art Archive style path: /caa/release-group/{mbid}/front-250
  if (url.pathname.startsWith("/caa/")) {
    res.writeHead(200, { "content-type": "image/png" }).end(PNG);
    return;
  }

  if (url.pathname === "/search/movie") return send(res, { page, total_pages: 2, results: page <= 2 ? tmdbResults("movie", page) : [] });
  if (url.pathname === "/search/tv") return send(res, { page, total_pages: 2, results: page <= 2 ? tmdbResults("tv", page) : [] });

  if (url.pathname === "/anilist" && req.method === "POST") {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const variables = JSON.parse(raw || "{}").variables ?? {};
      send(
        res,
        anilistBody(Math.max(1, Number(variables.page ?? 1)), variables.type),
      );
    });
    return;
  }

  if (url.pathname === "/api/storesearch/") return send(res, steamBody());
  if (url.pathname === "/search.json") return send(res, openLibraryBody(page));

  if (url.pathname === "/search/artist") {
    const index = Math.max(0, Number(url.searchParams.get("index") ?? "0"));
    return send(res, deezerBody(index));
  }

  res.writeHead(404).end("{}");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`mock-sources listening on http://127.0.0.1:${PORT}`);
});
