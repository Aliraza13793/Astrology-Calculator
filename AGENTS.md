# Astrology — Agent Conventions

## What this project is

A collection of standalone, client-side astrology tools. No backend, no build
step, no framework. The root `index.html` is a hub with no calculator of its own,
and each tool is a page under `tools/`:

- `tools/big-three/` — Sun, Moon & Rising Sign Calculator
- `tools/love-calculator/` — two charts compared, deliberately without a score
- `tools/astro-calendar/` — a year of events, solved rather than tabulated

## Hard constraints

1. **No build step.** Nothing in `js/` or `tools/` may use `import`, `export`,
   `require`, JSX, TS syntax, or any bundler-only feature. Files must run by
   double-clicking the page.
2. **Scripts are classic `<script>` tags** in dependency order, loaded at the end of
   `<body>`. Each file wraps its code in an IIFE and attaches to a single global
   namespace. Never use `type="module"`.
3. **No runtime dependencies, no CDNs.** No npm packages, no external JS/CSS/fonts.
   Network calls are limited to the documented geocoding API.
4. **Everything works offline except city search.** All computation happens in the
   browser. No data is sent anywhere except the city name to the geocoding API.
5. **No secrets in the repo.** No API keys.
6. **A page loads only what it uses.** The Big Three does not load `planets.js`,
   because it asks for no planets.

## Architecture

```
index.html          the hub: prose + links, no calculator
sitemap.xml         the pages that exist, and no others
robots.txt          nothing disallowed
css/styles.css      all styling, custom properties for theming
js/config.js        tunable constants (orbs, accuracy notes, endpoints)
js/core/            pure computation, zero DOM access
  math.js           deg/rad, modulo, angle helpers
  time.js           Julian day, timezone resolution, sidereal time
  ephemeris.js      Sun, Moon, obliquity, nutation
  vsop87d.js        DATA: VSOP87D periodic terms, truncated. Generated, never
                    hand-edited; regenerate rather than patch a coefficient.
  planets.js        Mercury/Venus/Mars/Jupiter/Saturn apparent places and rates
  houses.js         Ascendant, MC, whole sign house cusps
  zodiac.js         sign boundaries, sign lookup, element/modality/polarity
  chart.js          orchestrates a full chart, plus solar noon. Takes an options
                    object for extra planets rather than being forked per tool.
  reading.js        analysis only: aspects, balances, dispositor, rule ids
  synastry.js       cross-chart aspects between two charts
  events.js         equinoxes, Moon phases, Moon ingresses, retrograde stations
js/data/            content: sign descriptions, aspect meanings, synastry prose
js/data/signs.js
js/data/aspects.js
js/data/interpretations.js
js/data/synastry.js
js/services/        I/O only, no math
  geocode.js        city search, caching, timezone lookup
  storage.js        localStorage wrapper (saved readings, consent)
js/ui/              DOM only, no math
  form.js           input wiring, validation, city autocomplete. Takes an id
                    prefix so two people fit on one page from one implementation.
  dom.js            the shared element builder
  reveal.js         the reveal animation
  results.js        Big Three result rendering
  app.js            bootstrap for the Big Three page
tools/<name>/index.html   the page itself
tools/<name>/app.js       bootstrap for that page only
tests/              node-based test runner, no framework
  run.js
  dom-stub.js        the minimum DOM the render path needs
  *.test.js
```

Dependency rule: `core` never imports `data` or `ui`; `data` never imports `ui`;
`ui` may use `core`, `data`, and `services`. Direction is one-way.

`core` and `data` files must be loadable in Node, because the tests require
them directly. That means they may not touch `document` at load time.

## Code style

- 2-space indent, semicolons, single quotes.
- `var`/`let` only, never `const` reassignment; prefer `let`. No `async/await` in
  `core` (it must stay synchronous and testable).
- All angles are **degrees** at every public boundary. Convert to radians only
  inside a function, and name those `xRad`.
- All functions return plain objects, never classes. Data structures are frozen
  at module load where practical.
- Every public function in `core` has a JSDoc block stating units and accuracy.
- No comments explaining *what* the code does. Only *why*, when non-obvious, and
  only for astronomy formulas (cite the Meeus chapter number).

## Astronomy rules

- Reference: Jean Meeus, *Astronomical Algorithms*, 2nd ed. Cite chapter numbers.
  - ch. 7 Julian day, ch. 10 sidereal time, ch. 12 apparent sidereal time,
  - ch. 22 nutation & obliquity, ch. 25 solar coordinates,
  - ch. 47 lunar position (ELP-2000/82 truncation), ch. 13/14 rising/setting.
- Planets come from VSOP87D (Bretagnon & Francou 1988), as tabulated in Meeus
  Appendix III. The coefficients live in `vsop87d.js` and are **generated, not
  hand-typed**. Regenerate the file rather than patching a coefficient; a
  mistyped digit moves a planet by degrees and is invisible until it is checked.
- The VSOP87 series **return radians**. Do not convert them again.
- Geocentric ecliptic longitude apparent of date. The planets need light time,
  annual aberration and nutation to reach the apparent place; the Sun and Moon
  already have aberration and nutation built into `ephemeris.js`.
- A retrograde is a zero of the longitude **rate**, not of the longitude. This is
  why station dates are more accurate than the raw longitudes suggest: a constant
  offset cancels out of the difference.
- Moon ecliptic **latitude is deliberately not computed** (see SPEC). Never
  "fix" this without updating SPEC and the accuracy notes in the UI.
- Timezone offsets must come from the IANA database via `Intl`, never from a
  hardcoded table, and must be resolved for the *historical* date, not today.
- For a steadily increasing angle (Sun longitude, Moon longitude, their
  elongation), find events by **unwrapping along a scan** and solving for a
  rising crossing. Looking for a sign change of a wrapped difference also fires
  at the antipode, which is a discontinuity, not an event.

## Testing

- `node tests/run.js` must pass before any change is considered done. No
  framework; plain `assert`. The runner awaits promises, so a test may be
  async, and an unhandled rejection fails the run.
- Every `core` module needs tests. Reference values in tests must include a
  citation and be independently checkable.
- Accuracy tests compare against published ephemeris values with a stated
  tolerance in arcseconds. Tighten tolerances only with evidence.
- When a published value cannot be trusted, test a physical invariant instead:
  an equinox for the Sun, a distance minimum for perihelion, the horizon for
  the Ascendant. **A remembered constant is not a reference.** During v2 the
  remembered Mercury retrograde dates were wrong and the code was right; JPL was
  scanned directly instead.
- `tests/integration.test.js` parses every page in its `PAGES` table, so the
  markup and the scripts cannot drift apart, and two pages cannot share a title,
  description, canonical or `h1`. Add a new page there or the suite will not
  hold it to the accessibility and duplicate-content rules.
- `tests/pages.test.js` renders each tool page through its real page scripts
  against the DOM stub. A page that throws, or that prints `undefined`, fails.

## UI rules

- Mobile-first, works at 360px. No horizontal scroll.
- One primary CTA per screen.
- Results are reachable without JavaScript errors and the page must still make
  sense with JS disabled (explainers and FAQ are static HTML, not JS-rendered).
- Accessibility: every input has a `<label>`, all interactive elements are
  keyboard reachable, focus is visible, `prefers-reduced-motion` is respected,
  the reveal animation has a non-animated fallback.
- Contrast ratio at least 4.5:1 for body text.
- `classify()` returns geometry only. Read `harmony` and `symbol` from
  `data/aspects[aspect.name]`, never off the classifier's own result.

## Adding a new tool

1. Create the tool in its own folder, `tools/<tool-name>/`, with its own
   `index.html`, reusing `css/` and `js/core/` by relative path.
2. Do not fork shared code. If a new tool needs different behaviour from a
   `core` function, add an options object rather than duplicating.
3. Update `SPEC.md` for the new tool, link it from the root `index.html`, and add
   it to `sitemap.xml`.
4. Give the new page its own title, meta description, canonical and `h1`, and
   register it in the `PAGES` table in `tests/integration.test.js`. The hub
   should *describe* a tool, never repeat it.

## Definition of done

- No console errors or warnings.
- `node tests/run.js` passes.
- Works from `file://` by double-clicking the page.
- Keyboard-only walkthrough of form and results passes.
- SPEC.md updated to match the code.
