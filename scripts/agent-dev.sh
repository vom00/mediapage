#!/usr/bin/env bash
# Start an isolated dev server for one redesign workstream:
#   bash scripts/agent-dev.sh <name> <port>
# Uses its own dist dir (Next allows one dev server per dist dir) and
# the shared local emulators + mock media sources.
set -euo pipefail
name="$1"; port="$2"
export NEXT_DIST_DIR=".next-$name" NEXT_PUBLIC_FIREBASE_EMULATORS=1 \
  TMDB_API_KEY=e2e-fixture-key TMDB_BASE_URL=http://127.0.0.1:4601 \
  TMDB_IMAGE_BASE=http://127.0.0.1:4601/img ANILIST_BASE_URL=http://127.0.0.1:4601/anilist \
  JIKAN_BASE_URL=http://127.0.0.1:4601/jikan STEAM_BASE_URL=http://127.0.0.1:4601 \
  STEAM_IMAGE_BASE=http://127.0.0.1:4601/img OPENLIBRARY_BASE_URL=http://127.0.0.1:4601 \
  OPENLIBRARY_COVER_BASE=http://127.0.0.1:4601/img DEEZER_BASE_URL=http://127.0.0.1:4601
exec npx next dev -p "$port"
