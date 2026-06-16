# mediapage

A Letterboxd-style profile for everything you love — five favorites each across
**Movies, Shows, Music, Video Games, and Books**, plus recommendations,
following, and notifications.

Built with Next.js (App Router) + React, TypeScript, Tailwind CSS, and Firebase
(Auth, Firestore, Storage). There is no custom backend — **Firestore security
rules are the security boundary.**

## Local development

Local dev runs fully offline against the Firebase Emulator Suite, so it needs no
real project and costs nothing.

Prerequisites: Node 20+, and a **JDK 21+** (the Firestore emulator requires it).

```bash
npm install

# Terminal 1 — emulators (auth, firestore, storage)
npx firebase emulators:start --only auth,firestore,storage --project demo-mediapage

# Terminal 2 — dev server at http://localhost:3000
npm run dev
```

`.env.local` keeps `NEXT_PUBLIC_FIREBASE_EMULATORS=1`, so the app talks to the
emulators. To run local dev against the real Firebase project instead, remove
that line and add the values from [Environment variables](#environment-variables).

## Testing

```bash
npm run test    # unit + integration (integration needs the emulators running)
npm run lint
npm run e2e      # Playwright (needs the emulators + the e2e dev server)
```

## Deploy

The app is server-rendered (dynamic routes plus the `/api/search` route), so it
needs a Node host. Recommended: **Vercel** for the app, **Firebase** (free Spark
plan) for Auth and data. Firebase project: `mediapage-c4281`.

### 1. Publish the security rules + indexes (one-time, and whenever they change)

```bash
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes
```

A brand-new Firestore denies everything until these rules are deployed. Indexes
build asynchronously and may take a few minutes.

### 2. Deploy the app to Vercel

```bash
npx vercel            # link or create the Vercel project
# then add the env vars below in the Vercel dashboard
#   (Project → Settings → Environment Variables), and:
npx vercel --prod     # promote to your production URL
```

### 3. After the first deploy

- Firebase Console → **Authentication → Settings → Authorized domains** → add
  your Vercel domain (e.g. `mediapage-xxxx.vercel.app`). Required for **Google**
  sign-in; email/password works without it.

## Environment variables

**Client** (public, `NEXT_PUBLIC_`) — set these in Vercel:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyDGydVGkXMYuPZt7SWLSFHnBuSVsH4AXUE` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `mediapage-c4281.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `mediapage-c4281` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `mediapage-c4281.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:250117114491:web:3c1a271167341e934170de` |

These are public by design (a Firebase web key identifies the project; access is
controlled by the rules + Auth). Do **not** set `NEXT_PUBLIC_FIREBASE_EMULATORS`
in production.

**Server** (secret — never `NEXT_PUBLIC_`) — set in Vercel; optional, but the
library search returns no results without them:

| Variable | Purpose | Get a free key |
| --- | --- | --- |
| `TMDB_API_KEY` | Movie / TV / anime search | themoviedb.org/settings/api |
| `IGDB_CLIENT_ID` | Video-game search (every platform) | dev.twitch.tv/console/apps |
| `IGDB_CLIENT_SECRET` | Video-game search (every platform) | dev.twitch.tv/console/apps |

TMDB is the only **required** key. Music (Deezer artists), books (Open
Library), and the anime fallback (Jikan/MyAnimeList) use keyless public
endpoints.

**Video games** use [IGDB](https://www.igdb.com) — the full cross-platform
catalogue — when `IGDB_CLIENT_ID` + `IGDB_CLIENT_SECRET` are set. IGDB is free:
create an app at [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps)
to get the Client ID and Client Secret (it's Twitch-operated). Until those are
set, the games shelf automatically falls back to Steam's keyless storefront
search, so it still works with no setup — it's just limited to games sold on
Steam.
