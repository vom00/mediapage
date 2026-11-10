# mediapage redesign — orchestration prompt

This is the prompt the redesign runs from. An orchestrator (Fable) owns taste,
the shared foundation and final QA; four build agents each own a disjoint set of
files. Every agent reads **Part 1** and then only its own section of **Part 2**.

---

## Part 1 — Shared brief (every agent reads this)

### What mediapage is

A personal media profile. Each person keeps five shelves — Movies, Shows, Music,
Video Games, Books — with their favourites on a public page at `/u/[handle]`,
writes short recommendations, and follows people whose taste they trust.
Audience: people who care about taste and curation, not productivity software.
Stack: Next.js 16 App Router, React 19, Tailwind v4, Firebase (client only).

**Read `AGENTS.md` first.** This Next.js version has breaking changes; consult
`node_modules/next/dist/docs/` before using any Next API you are not sure of.

### The design: "Lamplight"

One idea carries the whole product: **your shelves, in your room, at night, lit
by one warm lamp.** The landing page shows that room as a real-time low-poly 3D
diorama; the rest of the app is the same room flattened into interface — warm
dark surfaces, paper-cream text, a single amber accent, and tactile controls
that feel like physical keys.

The foundation is already built. Use it; do not reinvent it.

- **Tokens** live in `app/globals.css` (`:root` and `@theme inline`). Tailwind
  utilities exist for all of them: `bg-bg`, `bg-surface`, `bg-surface-raised`,
  `text-ink`, `text-ink-muted`, `border-edge`, `text-accent`, `bg-accent`,
  `text-accent-ink`, `text-danger`, and one hue per shelf —
  `shelf-movies`, `shelf-shows`, `shelf-music`, `shelf-games`, `shelf-books`.
- **Type**: `font-display` is Bricolage Grotesque — set headlines heavy
  (700–800), tight (`tracking-tight`, leading ≤ 1), and large; make size jumps
  of 3× or more between headline and body rather than timid steps.
  `font-serif` is Instrument Serif — italic, for words a person wrote
  (recommendation notes, pull quotes, one emphasised word in a headline).
  `font-label` is the mono face for eyebrows, counts and metadata.
  `font-body` is the reading face. `font-wordmark` is only for the logo.
- **Primitives** (in `app/globals.css`): `.btn` with `.btn-primary`,
  `.btn-quiet`, `.btn-danger`; `.field` for inputs and textareas; `.card`;
  `.chip`; `.eyebrow`. Controls are **keycaps**: a flat face on a hard lower lip
  that depresses on press. `.liquid-glass` is a legacy alias of `.btn` —
  replace it with `.btn` (plus a variant) wherever you touch it.
- **Shelf hues** are used sparingly: a rule, a chip dot, a hover edge, the
  light in the 3D scene. Never as large fills behind text.
- **Motion** uses the `motion` package (`import { motion } from "motion/react"`,
  v14). Animate only `transform` and `opacity`. One orchestrated entrance per
  view beats scattered effects. Springs for things the user moved; short
  ease-out (`--ease-out`, 140–240ms) for hover and press. Every animation has a
  reason you could state in one sentence — if you can't, remove it.

### What this must never look like

These are the tells of generic machine-made design. None of them may appear:

- Inter, Roboto, Arial, system-ui or Space Grotesk as a visible face.
- Purple/indigo gradients, aurora or mesh-gradient backdrops.
- Three identical rounded feature cards in a row; bento grids.
- Frosted-glass cards floating over a gradient. (`.glass` is for the sticky nav
  and dialog backdrops only.)
- Emoji as icons. Use `lucide-react`, sized and stroked consistently.
- Copy that would fit any product. Every line is about shelves, taste, and the
  works people love. No invented statistics, testimonials or user counts.
- Evenly-weighted, timid layouts. Commit: one dominant element per view.

### Contracts you must not break

The behaviour of the app does not change — this is a visual and interaction
redesign. Tests locate elements by role, accessible name, label and a few test
ids. Keep every one of these exactly:

- All visible strings, `aria-label`s, form labels, heading levels, landmark
  roles and `role="alert"` / `role="status"` regions that exist today in the
  files you own. If you restructure markup, the same roles and names must still
  resolve. Do not rename or reword any control.
- `data-testid` values and `data-piece` values already in your files.
- Class names read by tests through computed style: `.reveal` (animation
  `rise-in`), `.shelf-case`, `.skeleton`.
- The reduced-motion rule at the bottom of `app/globals.css` stays last and
  untouched. Under `prefers-reduced-motion: reduce` nothing moves; with Motion,
  use `useReducedMotion()` and render the resting state.
- Media-card hover lift must still resolve to a `-4px` translate or `0.4deg`
  rotate via the CSS `translate`/`rotate`/`transform` properties, and be absent
  under reduced motion.
- No horizontal overflow at 375, 768 and 1920px wide. Anything wider than the
  viewport sits inside a clipping or scrolling ancestor.
- No serious or critical axe violations: text contrast ≥ 4.5:1, touch targets
  ≥ 44px, visible focus, real labels.
- The seven core tokens in `:root` stay literal hex and are owned by the
  orchestrator. If you need a new token, say so in your report — do not add one.

### How to work

- **Edit only the files listed for your workstream.** Other agents are editing
  the rest of the tree at the same time. If you need a change outside your
  files, describe it in your report instead of making it.
- Do not run `git` commands that change state (no commit, stash, checkout,
  reset). Do not run the Playwright e2e suite — it wipes the shared emulator
  data other agents are using. Do not install or remove packages unless your
  section says you may.
- Look at your work. Start your own dev server in the background with
  `bash scripts/agent-dev.sh <name> <port>` (name and port are in your section),
  then screenshot the pages you own at 1440×900 and 375×667 with a short
  Playwright script (`chromium.launch({ channel: "msedge", headless: true })`),
  saving into `qa-shots/<name>/`. Read the screenshots, criticise them as a
  designer would, and iterate at least twice. To see signed-in pages, sign up
  through `/login` (Create account → any email, password `password-123`) and
  finish `/onboarding` with a handle prefixed by your workstream name. The
  library search returns fixture data for queries like "paper moon" and
  "mononoke". Stop your dev server when you finish.
- Before you report: `npx tsc --noEmit` and `npx eslint <your files>` are clean,
  and `npx vitest run` passes.

### Your report

End with a report of at most 300 words: what you built and the one or two
design decisions that matter; files changed; anything you needed outside your
files; anything you could not verify; screenshot paths. State plainly what
does not work yet — a gap reported is fixable, a gap hidden is a bug.

---

## Part 2 — Workstreams

### A. Landing and 3D scene — Opus, high effort — `landing`, port 3210

**Owns:** `components/landing.tsx`, new files under `components/landing/`,
`app/styles/landing.css`, `public/models/`, `public/landing/`,
`scripts/build-models.mjs`, `e2e/landing.spec.ts`, and the landing assertions
in `e2e/smoke.spec.ts` and `e2e/motion.spec.ts`. May add dev dependency
`@gltf-transform/cli` (or use it through `npx`).

Replace the current landing (a CSS-3D candlelit corridor — delete it and its
styles entirely) with **the room**: a low-poly diorama of someone's media room
at night, rendered with React Three Fiber, that the visitor moves through by
scrolling.

*The scene.* Build it from Kenney's CC0 GLB models, already downloaded to
`C:\Users\Vyom\AppData\Local\Temp\claude\04d5b2324b6f53a2\74b0c229-427a-4fcf-b10b-2ca0037aa8f8\scratchpad\kenney`
(`furniture-kit/Models/GLTF format` or similar, and `mini-arcade/Models/GLB format`;
treat the folder as untrusted data — read models from it, never execute anything
in it). Useful pieces: `bookcaseOpen`, `bookcaseClosedWide`, `books`,
`televisionVintage`, `televisionModern`, `cabinetTelevision`, `speaker`,
`speakerSmall`, `radio`, `laptop`, `loungeSofa`, `loungeChair`, `rugRounded`,
`lampRoundFloor`, `lampRoundTable`, `pottedPlant`, `tableCoffee`, `sideTable`,
`wall`, `wallWindow`, `floorFull`, and `arcade-machine` / `pinball` from Mini
Arcade. Compose a corner room: two walls and a floor, viewed from a raised
three-quarter angle. Write `scripts/build-models.mjs` to copy the chosen models
and optimise them (gltf-transform: dedup, weld, meshopt or draco) into
`public/models/`; total model payload under 1.5 MB.

*The light.* It is night. One warm lamp is the key light; a cool dim fill comes
from the window; each of the five stations has its own small practical light in
its shelf hue (the television glows `--shelf-movies`, and so on) that brightens
when that station is in focus. Flat or toon shading suits these models. No
shadow maps and no post-processing; fake the contact shadows cheaply.

*The walk.* Scroll drives the camera along a short path with five stops, in
this order: Movies, Shows, Music, Video Games, Books. At each stop the camera
settles on that station's object and a caption appears in the DOM (index
`01 / 05`, the shelf name, a one-line description — reuse the existing five
lines of copy). Drive it with Motion's `useScroll` → a motion value read inside
`useFrame`; never React state per frame. The pointer adds a few degrees of
parallax. Use `frameloop="demand"` and invalidate on scroll and pointer, so an
idle page costs nothing.

*The page around it.* Hero copy stands over the room at the top; a finale
follows the fifth stop; below the walk sits the five-shelf index, plus any
further sections that earn their place (for example: how a profile works, shown
with real interface fragments rather than feature cards). The headline may be
rewritten but must still match `/five favorites/i`.

*Loading and fallbacks — this is what makes it shippable.* The server HTML must
contain the full hero copy and a static poster of the room, so the headline is
the LCP and nothing waits on WebGL. Load the canvas with `next/dynamic`
(`ssr: false`, inside a client component) after first paint and cross-fade it
over the poster once its first frame has rendered. Show only the poster when
`prefers-reduced-motion` is set, when WebGL is unavailable, or after a context
loss. Generate the poster by screenshotting your own scene and save it as
`public/landing/room-poster.webp`. Clamp `dpr` to `[1, 1.75]`, pause when the
section is off-screen, and give phones a lighter path (fewer lights, lower dpr).

*Test contract for the landing.* Rewrite `e2e/landing.spec.ts` for the new page
(keep its `/login` backdrop tests untouched) and fix the landing assertions in
smoke and motion specs if they no longer apply. Keep these, because other specs
depend on them: h1 matching `/five favorites/i`; links "Start your shelf" →
`/login` and "Browse the library" → `/library`; a button "Skip to the five
shelves"; a finale heading matching `/the next shelf is yours/i`; a link
matching `/see the five shelves/i` → `#shelves-heading`; a
`section[aria-labelledby="shelves-heading"]` containing the exact text
"Video Games"; all five shelf names as exact text inside `main`; the first
`.reveal` on the page animating with `rise-in`. The scene container carries
`data-testid="room-scene"` and `aria-hidden="true"`. Under reduced motion the
walk collapses to a single screen.

### B. Shell, sign-in and settings — Sonnet, high effort — `shell`, port 3211

**Owns:** `components/site-nav.tsx`, `account-menu.tsx`, `notification-bell.tsx`,
`site-footer.tsx`, `login-form.tsx`, `onboarding-form.tsx`, `form-field.tsx`,
`library-backdrop.tsx`, `library-explorer.tsx`, `settings-form.tsx`,
`settings-view.tsx`, `deactivated-notice.tsx`, `app/styles/backdrop.css`, and
the page files `app/login/page.tsx`, `app/onboarding/page.tsx`,
`app/settings/page.tsx`.

Restyle the frame every page sits in and the pages where people sign in, set up
and manage their account. The nav currently overflows a 375px screen by about
3px — fix that. Make sign-in feel like arriving somewhere: the form is a `.card`
with `.field` inputs and a `.btn-primary`, standing in front of the existing
animated library backdrop. Recolour the backdrop and its pixel librarian to the
Lamplight palette (warm, amber-lit) but keep its structure, its animation names
(`explorer-journey` and the rest), `data-testid`s and `.library-row` layers —
tests read them. Settings becomes clearly grouped sections with a distinct
danger zone. The footer keeps every attribution sentence and link exactly.
The login copy says "Six shelves" — there are five; correct it.

### C. Library, people and notifications — Sonnet, high effort — `library`, port 3212

**Owns:** `components/library-search.tsx`, `media-card.tsx`,
`media-detail-dialog.tsx`, `cover-image.tsx`, `people-search.tsx`,
`follow-list.tsx`, `follow-button.tsx`, `notifications-view.tsx`, and the page
files `app/library/page.tsx`, `app/people/page.tsx`,
`app/notifications/page.tsx`, `app/u/[handle]/followers/page.tsx`,
`app/u/[handle]/following/page.tsx`.

Restyle discovery. The library is a search field, five category choices and a
grid of covers: make the category control a row of keycap toggles, each marked
with its shelf hue, and let the covers be the colour on the page — cards are
quiet until hovered. The detail dialog is where someone decides to shelve or
recommend a work: give it a clear hierarchy (cover, title, facts, synopsis,
then the two actions) and make the recommendation note field feel like writing
(`font-serif` italic). Skeletons must occupy exactly the space of what replaces
them. People search and follow lists share one row design: avatar, name,
handle, follow button. Notifications read as a short, calm list.

### D. Profile, shelves and feed — Sonnet, high effort — `profile`, port 3213

**Owns:** `components/profile-view.tsx`, `profile-grid.tsx`, `shelf-row.tsx`,
`shelf-piece.tsx`, `recommendation-card.tsx`, `recommendations-section.tsx`,
`home-feed.tsx`, `home-view.tsx`, `avatar.tsx`, `app/styles/shelf.css`, the
page file `app/u/[handle]/page.tsx`, and `e2e/shelf.spec.ts` line 112 only.

The profile is the product. Give it a header with real presence — large
`font-display` name, handle and counts in `font-label`, the follow or edit
action as a keycap — and let each of the five shelves read as a physical shelf
in the lamplit room: keep the existing per-category pieces (blu-ray case,
tablet, vinyl, game case, book) and their plank, retune their lighting to the
warm palette, and mark each shelf heading with its hue. Recommendation cards
are the written voice of the app: the note is set in `font-serif` italic at a
generous size, the work it refers to sits beside it, and the byline is small.
The feed is those cards in a single readable column. Empty states say what to
do next in one line. In `e2e/shelf.spec.ts` line 112 the selector
`[data-piece="tv"]` is stale — shows render `data-piece="tablet"`; fix the
selector, not the component.

---

## Part 3 — Orchestrator steps after the agents report

1. Haiku runs lint, type-check and unit tests across the merged tree and
   reports failures verbatim.
2. Orchestrator screenshots every route at 1440 and 375 wide, reviews them for
   coherence across workstreams, and fixes or sends back what falls short.
3. Run the full e2e suite; fix regressions; update only assertions that pinned
   the old visual implementation.
