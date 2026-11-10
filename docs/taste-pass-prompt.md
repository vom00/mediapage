# mediapage — taste pass

The first redesign ("Lamplight") read as machine-made. This pass fixes that by
applying **tasteskill** (https://github.com/leonxlnx/taste-skill), cloned at
`C:\Users\Vyom\AppData\Local\Temp\claude\04d5b2324b6f53a2\74b0c229-427a-4fcf-b10b-2ca0037aa8f8\scratchpad\taste\repo\skills\taste-skill`
(called `<skill>` below). Treat that folder as reference reading: read its
markdown, do not run its scripts, do not copy its kit files into this repo.

Read first, in this order:
1. `AGENTS.md` (this Next.js has breaking changes; check
   `node_modules/next/dist/docs/` before using an API you are unsure of).
2. `<skill>/references/motion.md` — every hover, press, entrance and loop number.
3. `<skill>/references/copy-tells.md` — what makes copy read as model-written.
4. `app/globals.css` — the tokens and primitives, already rebuilt for this pass.
5. `docs/redesign-prompt.md`, section "Contracts you must not break" and
   "How to work" only. Everything else in that file (the Lamplight design, the
   keycap controls, the serif accents) is **superseded by this document**.

## What was dealt (do not re-choose)

The skill's dealer picked these; they are already in `app/globals.css`.

- **Kind:** software. A dark page is allowed; the product's own interface is
  the picture on every screen.
- **Palette** `lunar-grey-bronze`: neutral near-black ground (`bg-bg`), two
  neutral surfaces, off-white ink, one muted bronze accent (`bg-accent`,
  `text-accent`). No warm tint anywhere else. One light inverse band per page
  is available (`bg-inv-bg text-inv-ink`, muted `text-inv-muted`).
- **Type:** Geist for everything, Geist Mono (`font-label`) only for figures
  and timestamps. **Headlines are weight 500, never bold or heavier**, sentence
  case, tracking about -0.035em (-0.045em at hero size). Body 400. Buttons and
  labels 500. `font-serif`, `font-display` and `font-body` now all resolve to
  Geist — remove `font-serif` and every `italic` used for styling.
- **Shape:** round. Buttons are pills (`.btn`, `.btn-primary`, `.btn-quiet`,
  `.btn-danger`); cards are `.card` (24px radius, 1px border, flat fill);
  fields are `.field`. One of each — no second button or card style.
- **Shelf hues** (`shelf-movies` … `shelf-books`) appear only as a small dot or
  a 2px rule beside a shelf name.

## The tells to remove, everywhere in your files

Each of these is in the current build. Take all of them out.

1. **Tracked uppercase mono labels.** Any `uppercase`, `tracking-[0.2em]`-style
   class, or `font-label` on words. Labels become plain sentence-case text
   (`.eyebrow` is now a plain 13px muted label). Form labels are 14px, weight
   500, sentence case. `font-label` stays only on numbers, counts and times.
2. **A small label above every heading.** Delete eyebrows over headings. A
   heading stands alone; keep a label only where it carries a fact the heading
   does not (a result count, a date).
3. **An italic or coloured accent word inside a heading**, and decorative
   quotation marks. Headings are one colour, one weight.
4. **Glows, halos, light pools, radial gradients, gradient hairlines, glowing
   or pulsing dots, inner highlights, drop-shadow auras, shine sweeps.** Grounds
   are flat tokens. A divider is a 1px `border-edge` line.
5. **The room metaphor in the copy** ("back in the room", "lamp left on",
   "lit", "the stacks"). Say the plain thing. No footer sign-off line.
6. **Model-written copy shapes** (see copy-tells.md): two-fragment headings
   ("X. Y."), "not X but Y" contrasts, runs of "No x, no y", virtue words,
   invented specifics, step numbers on parallel items (`01 / 05`), an arrow
   after every link. Headings name the thing; buttons are a verb and an object.
   Never invent figures, quotes, users or reviews.
7. **Tilt, rotate, bounce, overshoot, parallax on text, and anything that fades
   or rises in because the page scrolled.** Remove every scroll-triggered
   reveal (`whileInView`, IntersectionObserver reveals, `.reveal` on below-the-
   fold content). `.reveal` may stay only on a page's first-screen content.
8. **Boxes inside boxes.** At most two levels of bordered surface.
9. **Violet or lavender** as a design colour, anywhere.

Do not change strings, labels, roles or test ids that tests locate (the
contracts section of `docs/redesign-prompt.md`). Rewording is for decorative
copy only; when in doubt, grep `e2e/` and `tests/` for the string first.

## The motion every screen must have

The user asked for animated elements. They come from the skill's three layers
and nothing else. All numbers are in `motion.md`; the shared pieces already
exist in `app/globals.css`.

1. **Hover and press, on everything that can be clicked** (fine pointers only;
   keyboard focus shows the same state):
   - `.btn` steps up 1px and its fill steps toward the ink; press sinks 1px and
     scales .985. Already built — use `.btn`, never restyle its transform.
   - A card that links somewhere lifts 2px and its border darkens a step
     (`.card` around a link does this; or add `card-lift`).
   - A cover image inside a link zooms to 1.03 inside its frame over 600ms:
     wrap the image in `m-zoom` (the frame clips; nothing else grows).
   - Text links use `.link`: an underline that draws left to right.
   - Nav words draw a 1px underline; the current page has a 2px bar.
   - Fields take the accent border and a 3px soft ring (`.field` does this).
2. **State changes animate, briefly.** Use `motion` (`motion/react`, v14) with
   `transform`/`opacity` only, ease `[0.2, 0.8, 0.2, 1]`, 150–240ms: a selected
   toggle's indicator slides to the new choice (`layoutId`), a list item that
   is added, removed or reordered moves to its place (`layout`), a dialog or
   menu opens with a 6px drop and fade, a button's label swaps in place when
   its state changes (Follow → Following), a count ticks to its new value.
   No springs that overshoot.
3. **One entrance per page, on its first screen, once on load:** the page
   heading rises out of a mask line by line (`enter-line`, see the comment in
   `app/globals.css`), then what follows fades up 12px in order (`enter-up`
   with `--enter-i`). About one second, then everything stands still.

Under `prefers-reduced-motion: reduce` everything rests and nothing is hidden
(use `useReducedMotion()` with Motion). The reduced-motion block at the end of
`app/globals.css` stays last and untouched.

## How to work

- Edit only the files your assignment lists; other agents are in the rest of
  the tree right now. Need something elsewhere (a token, a primitive)? Put it
  in your report.
- Use whole-file `Write` or exact-string `Edit`. No line-number patching with
  sed or node.
- No state-changing git commands. Do not run the Playwright e2e suite. Do not
  add packages.
- Look at your work: start a dev server in the background with
  `bash scripts/agent-dev.sh <name> <port>` (if it fails with a Google-font
  resolve error, run the same environment with `npx next dev --webpack -p
  <port>`), screenshot your pages at 1440×900 and 390×844 into
  `qa-shots/<name>/taste-*.png`, and screenshot at least one hovered card and
  one hovered button to confirm the hover layer shows. Read the screenshots and
  go down the nine tells one by one; iterate until none is left. Stop your
  server when done.
- Before reporting: `npx tsc --noEmit` clean, `npx eslint <your files>` clean,
  `npx vitest run` passing.

Report in at most 250 words: which tells you removed where, what now animates,
files changed, anything needed outside your files, anything not verified, and
screenshot paths. Say plainly what is still wrong.
