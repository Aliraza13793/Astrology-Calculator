# SPEC — Astrology

**Product specification.** What we do, what we refuse to do, and the rules that
decide what happens in the awkward cases. Sections 1–4 are the contract and are
written so they can be checked; sections 5–9 are the engineering that satisfies
them.

Companion documents: `AGENTS.md` (how to work in this repository),
`CLAUDE.md` (points at `AGENTS.md`).

Version 2.0 · Three tools: **Big Three**, **Love Compatibility**,
**Astro Event Calendar** · Status: implemented, 191 tests passing.

---

## 1. What this project is

A home for small, single-purpose web tools that a person finishes in one sitting
and never has to sign up for.

Each tool is one page under `tools/`, doing one job entirely in the browser, with
no build step and no backend. The root `index.html` is a hub that links to them;
it deliberately holds no calculator of its own, so that it cannot compete with
the page that does a given job properly.

The tools share one astronomy core, so the constraints that make the first one
trustworthy — published astronomical series, no vendor default to 12:00, honest
accuracy claims — are constraints every tool inherits rather than re-decides.

| Page | Does |
| --- | --- |
| `index.html` | Hub: what each tool is for, and the method shared by all three |
| `tools/big-three/` | Tool 1: Sun, Moon and Rising signs from a real chart |
| `tools/love-calculator/` | Tool 2: two charts compared, with no score |
| `tools/astro-calendar/` | Tool 3: a year of events, solved rather than tabulated |

Reference implementation studied for tool 1:
`nextastrology.com/sign-calculators/sun-moon-rising-sign-calculator`.

## 1a. Search and duplicate content

A multi-page site fails in a specific way: three pages with the same title and
description, or a hub that quietly repeats a tool page's copy so neither can
rank. Both are checked in `tests/integration.test.js`, which fails if two pages
share a title, description, canonical or `h1`, or if the hub repeats more than a
short run of a tool page's body text.

Every page therefore carries its own title, meta description, canonical and
`h1`, and its own JSON-LD whose FAQ questions match the `<details>` elements
actually on that page. `sitemap.xml` and `robots.txt` are maintained by hand and
list exactly the four pages that exist.

Rank is not something a specification can promise. These rules remove the
on-page problems that are ours to fix; authority, links and usage are not.

## 2. What we do — tool 1, the Big Three calculator

A person enters a birth date, a birth time and a birth city. The page returns
their Sun, Moon and Rising signs, with the reasoning visible, and is honest when
the birth time is missing.

### 2.1 Feature inventory

Each feature carries an acceptance criterion that could fail.

| # | Feature | Acceptance criterion |
| --- | --- | --- |
| F1 | Birth date entry | Accepts any date 1800–2200. Rejects 31 February and out-of-range years with a message naming the problem, not "invalid". |
| F2 | Birth city entry | Free text with a suggestion list. Lists at most 6 cities, most populous first. A typed city that is not chosen from the list is refused, because a wrong city silently changes the answer. |
| F3 | Birth time entry | 24-hour time. Rejects malformed input with a message. |
| F4 | Optional name | Greets the reader by name if given. Never stored, never transmitted. |
| F5 | Unknown birth time | The reader can say they do not know. The page then says the Rising sign cannot be determined, and does not print one as if it could. |
| F6 | Three sign results | Sun, Moon and Rising, each with sign name, exact degree within the sign, house, element, modality and polarity. |
| F7 | Distinct interpretations | Each of the three carries text written for that position in that sign. Sun, Moon and Rising copy for the same sign must differ. |
| F8 | Honest accuracy | Every number on the page comes from a series we can cite, and the accuracy claim on the page is one the test suite demonstrates. |
| F9 | Synthesis | The three signs are compared with each other: aspects between the three points, element/modality/polarity balance, and the dispositor of the Ascendant. |
| F10 | Chart detail | Moon phase, illumination, age and distance; Sun distance; Midheaven position; house system named. |
| F11 | Reveal step | A short pause before results, skippable by the reader's system motion preference. Never a gate. |
| F12 | Explainers | Static prose explaining what the Big Three are, how the page calculates them, and why the Rising sign needs a real birth time. |
| F13 | FAQ | 7 questions in the markup, readable with JavaScript off. |
| F14 | Structured data | WebApplication and FAQPage JSON-LD, kept in step with the visible FAQ. |
| F15 | Privacy | One network request: the city name, to a geocoding service. Date, time, coordinates and the name never leave the device. |
| F16 | Works offline | After the page loads, everything except city search works with no network. |
| F17 | Works from a file | Double-clicking `index.html` on a local disk is a supported way to use the tool. |
| F18 | Mobile first | Usable at 360 px wide with no horizontal scrolling. |
| F19 | Keyboard only | The whole form and the whole result can be reached and read without a mouse. |
| F20 | Remembers the last search | After a successful calculation, the next visit refills the form. Never stores the name. |

### 2.0 Tools 2 and 3

**Tool 2, `tools/love-calculator/`.** Two birth records in, a comparison out.

| # | Feature | Acceptance criterion |
| --- | --- | --- |
| L1 | Two forms, one implementation | Both people are entered on one page from the same form widget via an id prefix. No second copy of the validator or the combobox. |
| L2 | Full charts for both people | Sun, Moon, Venus, Mars and the Ascendant for each, from real positions. |
| L3 | Cross aspects | Every pair inside its orb, reported with the degree it is off exact by, tightest first. Each orb in a unit that fits it: arcseconds, arcminutes, or decimal degrees. |
| L4 | Symmetry | Swapping the two people finds the same aspects. The report cannot depend on who was typed first. |
| L5 | No score | No percentage, no total, no "compatibility". A test fails if a number followed by % reaches the page. |
| L6 | Missing time | A person with no known birth time contributes no Ascendant, and the page says which person and why. |
| L7 | Honest reading | Each aspect gets a sentence generated from the real orb, so a tight aspect reads differently from a loose one. |
| L8 | Empty result is a result | If nothing falls inside an orb, the page says so plainly rather than rendering an empty list. |

**Tool 3, `tools/astro-calendar/`.** A year in, an event list out.

| # | Feature | Acceptance criterion |
| --- | --- | --- |
| A1 | Any year 1800–2200 | Solved, so years no table covers are as correct as years it does. |
| A2 | Four seasonal markers | Equinox and solstice solved from the Sun's own apparent longitude, about three months apart. |
| A3 | New and full Moons | Solved from the Sun-Moon elongation; alternating, 13.8–16 days apart, twelve or thirteen pairs a year. |
| A4 | Every Moon ingress | About 160 a year, and each one really does change the sign, checked either side. |
| A5 | Retrograde stations | For all five planets, from the zero of the longitude rate. Marked unobservable when they fall behind the Sun. |
| A6 | Local times | Displayed in the reader's own timezone; the calculation stays in universal time. |
| A7 | Filters | Categories can be switched off and the list updates without pressing the button again. All off is a stated state, not a blank page. |

### 2.2 Rules for the awkward cases

This is the part that decides whether the tool is honest. Each row is a rule,
not an aspiration.

| Situation | What we do | What we must never do |
| --- | --- | --- |
| Birth time unknown | Solve for true local solar noon at that place and date, report the clock time used and its distance from midday, and treat the Moon sign as reliable. | Print a Rising sign, or quietly substitute 12:00. |
| Birth time off by a few minutes | Show how many minutes of error it would take to change each sign. | Claim the Rising sign is exact. |
| A body within half a degree of a sign boundary | Say which body, how close, and how many minutes of birth-time error would flip it. | Present the sign as settled. |
| The local clock time happened twice (clocks went back) | Use the earlier instant, say so, and tell the reader to shift an hour if the certificate shows the later time. | Choose silently. |
| The local clock time never existed (clocks went forward) | Use the first real moment after the jump, and say so. | Choose silently. |
| A birth before standard time was adopted | Use the historical local mean time from the IANA database. | Use today's offset. |
| City search returns nothing | Say no city matched and suggest respelling. | Submit with raw text. |
| City search fails entirely | Say the search is unavailable. | Fabricate a location. |
| `localStorage` unavailable or full | Calculation proceeds, silently. | Break the page, or nag. |
| A calculation throws | Show a message on the city field and re-enable the button. | Leave the page stuck on a disabled button. |
| JavaScript disabled | Explainer, FAQ and method note remain readable. The form does nothing useful rather than breaking. | Show a blank page or a broken layout. |
| Reader asked for reduced motion | Results appear immediately. | Play an animation anyway. |

## 3. What we do not do, and why

| Not doing | Why |
| --- | --- |
| Email capture, newsletter, "15% off" | Nothing here should require an address to be useful. They are calculators, not funnels. |
| A "view your full report" paywall or upsell | We do not compute a full natal chart, so advertising one would be a lie. |
| Share buttons, shareable result links | A URL carrying a birth date, time and place is a privacy leak the current design does not have. |
| A compatibility score or percentage | Producing one means weighting a square against a trine by some arbitrary factor. The reader cannot tell a measurement from a preference once it is a single number, so the tool lists the actual aspects and their orbs. This is the one place where the obvious feature is refused on purpose. |
| Nodes, Chiron, Lilith, asteroids, houses beyond whole sign | Out of scope. Not advertised, not hinted at. |
| Uranus, Neptune, Pluto in synastry | Generational bodies say something about an era, not about two people, so they are excluded from the pair list. |
| Retrograde meaning, or advice attached to any event | A retrograde is a fact about motion. What it "means" is not computed, because it is not a calculation. |
| Natal, transits, progressions beyond the calendar | Separate tools at most, and each should be its own spec. |
| Accounts, saved readings, sync, analytics | A backend would violate the constraint that makes this trustworthy and cheap to host. |
| More than one primary button per screen | One thing to do at a time. |

## 4. Known limitations, accepted

Stated rather than hidden. Each is a decision, not a bug.

- **City search needs the network.** Every other part works offline, but a city
  name cannot be resolved to coordinates without a request. A reader who is
  already offline at first load cannot use the tools. Mitigation when it matters:
  a small bundled list of the largest cities, as a fallback. Not built yet,
  because it is a maintenance burden and the reference site has the same limit.
- **The Sun is good to 0.01°, not arcseconds.** Full VSOP87 would improve a
  number that is already a hundredth of a sign's width. See §6.2.
- **Planetary longitudes carry about 40″ of residual.** The reduction to the
  apparent place is complete, so what is left is the truncated series and the
  difference from JPL. That is 1/2500th of a sign, so it cannot change which
  sign a planet is in. Station dates are better than 40″ suggests, because a
  retrograde is a zero of the longitude *rate*, in which a constant offset
  cancels: measured against JPL the stations land within half an hour, and the
  lunar and seasonal events within minutes.
- **Terrestrial and Universal Time are treated as equal.** Worth at most 69 s of
  solar longitude today, and rather more in the early years the calendar accepts.
  This is the largest single term in the equinox tolerance.
- **Houses are whole sign, so the Midheaven is not on the tenth cusp.** Stated
  in the results. See §6.3.
- **The Moon's ecliptic latitude is not computed.** See §6.3.
- **Birth time precision is the accuracy floor.** A four-minute error can move
  the Rising sign. Nothing a page can do about that except be honest, which F8
  requires. In the compatibility tool a missing time means no Ascendant for that
  person, and the page says so rather than substituting noon.

## 5. Architecture

```
index.html            hub: markup, JSON-LD, links to each tool
sitemap.xml           the four pages that exist, and no others
robots.txt            nothing disallowed; points at the sitemap
css/styles.css        all styling, custom properties for theming
js/config.js          tunable constants: orbs, year range, endpoint, accuracy copy
js/core/              pure computation, zero DOM access
  math.js             deg/rad, modulo, signed angle, rounding, clamping
  time.js             Julian day, IANA timezone resolution, sidereal time
  ephemeris.js        Sun, Moon, obliquity, nutation, Moon phase
  vsop87d.js          DATA: VSOP87D periodic terms, truncated (do not hand-edit)
  planets.js          Mercury/Venus/Mars/Jupiter/Saturn apparent places, rates
  houses.js           MC, Ascendant, whole sign cusps, house lookup
  zodiac.js           sign boundaries, degree formatting, rulers
  chart.js            one birth record in, one chart out; also solar noon
  reading.js          aspects, element/modality tallies, dispositor, rule ids
  synastry.js         cross aspects between two charts
  events.js           equinoxes, Moon phases, Moon ingresses, stations
js/data/              content only, no behaviour
  signs.js            12 signs: element, modality, polarity, rulers, 3 texts
  aspects.js          aspect definitions and the prose for each
  interpretations.js  prose keyed by the rule ids reading.js emits
  synastry.js         roles, themes, and the sentences a cross aspect produces
js/services/          I/O only, no maths
  geocode.js          city search, ranking, caching, timeouts
  storage.js          localStorage wrapper that fails soft
js/ui/                DOM only, no maths
  form.js             validation, city combobox, unknown-time toggle
  dom.js              the shared element builder
  reveal.js           the reveal step, reduced-motion aware
  results.js          rendering for the Big Three
  app.js              bootstrap for the Big Three page
tools/<name>/index.html  the page itself
tools/<name>/app.js      bootstrap for that page only
tests/                node runner, no framework
  run.js              entry point: node tests/run.js
  dom-stub.js         the minimum DOM the render path needs
  *.test.js
```

**Hard constraints**

1. No build step. No `import`, `export`, `require`, JSX, TypeScript or bundler
   syntax anywhere in `js/` or `tools/`. This is what makes F17 possible.
2. Scripts are classic `<script>` tags in dependency order at the end of
   `<body>`, each an IIFE attaching to the single global `SMRC`. Never
   `type="module"`.
3. No runtime dependencies, no CDNs, no external fonts or stylesheets. The only
   network request is the city search.
4. All computation in the browser. Birth details are never transmitted.
5. No secrets, no keys in the repository.
6. A tool page loads only the core modules it actually uses. The Big Three does
   not load `planets.js`, because it asks `chart.compute` for no planets and
   pays nothing for a 58 kB table.

**Dependency direction is one way.** `core` never reads `data` or `ui`; `data`
never reads `ui`; `ui` may read all three. `core` and `data` files are
individually loadable in Node, which is how the tests reach them.

**Units.** Degrees at every public boundary; radians only inside a single
function, named with a `Rad` suffix. Distances in kilometres, epochs in Julian
days, times in Unix milliseconds or IANA zone names.

**Data contract.** One birth record in:

```js
{
  year, month, day, hour, minute,   // local civil time, 24 hour
  timeUnknown,                       // boolean
  latitude, longitude,               // degrees, east positive
  timezone,                          // IANA name, e.g. 'America/New_York'
  placeName                          // label, for display only
}
```

One chart out: `moment` (the resolved instant and its offset), `sun`, `moon`
(longitude, distance, phase), `angles` (ascendant, MC, descendant, IC),
`houses` (twelve cusps and the system used), `bodies` (sun, moon, rising with
sign, degree, house, cusp margin), `planets` (only the bodies the caller asked
for), `mc`, `uncertainty`, `solarNoon` and `limits`. Then `reading.analyse(chart)`
returns aspects, balances, dispositor and a list of rule ids.

**Options, not forks.** `chart.compute(birth, options)` takes
`{ planets: ['venus', 'mars'] }`. Without it, `planets` is empty and the Big
Three costs nothing. A tool that needs different behaviour adds an options
object; it does not carry a second copy of the function. The same applies to
the birth form, which takes an id `prefix` so the compatibility page can put two
people on one page from one implementation.

## 6. The calculation

### 6.1 The chain

1. **Local time to UTC.** `time.zonedTimeToUtc` asks the platform's IANA
   database, through `Intl`, for the offset in force *at that historical
   instant*, never today's. Both daylight-saving edge cases are found by
   testing the offsets a day either side of the requested wall clock and
   keeping only the candidate instants that are self-consistent: both valid
   means the hour happened twice; neither valid means it never happened.
2. **Julian day.** Meeus ch. 7, switching to the Gregorian calendar at
   1582-10-15.
3. **Nutation and true obliquity.** Meeus ch. 22, abridged series.
4. **Sun.** Meeus ch. 25 mean longitude and equation of the centre, plus
   nutation and the annual aberration.
5. **Moon.** Meeus ch. 47: the 60 largest periodic terms of ELP-2000/82, with
   the eccentricity correction applied to the solar terms and the Venus, Jupiter
   and Earth perturbation terms added to the longitude. Nutation is included.
6. **Sidereal time.** Meeus ch. 12: GMST, plus the equation of the equinoxes for
   apparent time, plus longitude for local time.
7. **Angles.** The Midheaven is the ecliptic point whose right ascension is the
   local apparent sidereal time. The Ascendant solves the horizon equation at
   the given latitude:

   ```
   cos λ · cos θ + sin λ · (cos ε · sin θ + sin ε · tan φ) = 0
   ```

   which has two solutions 180° apart. The Ascendant is the one following the
   Midheaven, verified in tests to be the point on the eastern horizon with a
   negative hour angle.
8. **Signs and houses.** A sign is `floor(longitude / 30)`. Houses are whole
   sign from the Ascendant.
9. **Analysis.** Aspects among the three points from the orbs in `config.js`;
   element, modality and polarity tallies; the traditional ruler of the
   Ascendant and where it is placed; a list of rule ids. `data/interpretations.js`
   turns those ids into sentences.

### 6.2 Accuracy, and why the Sun is 0.01°

| Quantity | Expected error | How it is demonstrated |
| --- | --- | --- |
| Sun, ecliptic longitude | 0.01° (36") | within 0.02° of 0°, 90°, 180° and 270° at the 2020 equinoxes and solstices; within 36" of Meeus example 25.a |
| Moon, ecliptic longitude | ~30" | within 30" of Meeus example 47.a; within 1° of the Sun at a known new and full moon |
| Ascendant | a few arcseconds | altitude 0 and the eastern half of the horizon, checked against an independently written horizontal-coordinate routine, at five places on Earth |
| Midheaven | exact by construction | right ascension equals local apparent sidereal time to 1e-6° |
| Timezone offset | none | checked against historical rules: US 1975, Portugal 1983+, Russia 2011–2014, Kathmandu's 5:45, New York's pre-1900 local time |

A sign is only in doubt if a body sits within a fraction of a degree of a
boundary. When one does, the page says so (F8).

A full VSOP87 solar series was written and then **removed**: it could not be
checked against anything but memory. Meeus 25.2 is a published, short formula
with a stated error, which is what F8 actually requires. Improve this only with
a verified table and a test that demonstrates the improvement.

### 6.3 Deliberate omissions

**Moon ecliptic latitude.** Not computed. It never exceeds 5.16°, it cannot
change which sign the Moon occupies, and a partially applied table would be
worse than none. Do not "fix" this without updating §6.1, §6.2 and
`config.accuracy.note`.

**Placidus houses.** Not implemented. Placidus needs the four cusps 11, 12 and
2, 3 found by trisecting ascensional differences, *and* the remaining six
placed as exact antipodes; those rules are mutually inconsistent, and the
published definitions of the 2nd and 3rd cusps disagree about which reading is
correct. A Placidus table that could not be checked against published values
would be a plausible-looking approximation, so the house layer is **whole
sign**, which is unambiguous at every latitude. The consequence is stated in the
results: the Midheaven sits inside the tenth house rather than on its cusp.

The Rising sign depends on none of this. The Ascendant is a function of sidereal
time, latitude, longitude and obliquity alone.

**No name storage.** The name exists for the greeting only. `localStorage` holds
the last search's place and moment, never the name, and nothing at all until a
valid form has been submitted once.

## 7. Content specification

The prose is the product. It is held to the same standard as the arithmetic.

- Twelve signs, each with `sun`, `moon` and `rising` texts that say different
  things. A reading that could be pasted under any other sign is a bug.
- Every sign states a cost as well as a strength. No sign is purely flattering.
- The page states what astrology is: a language for thinking about yourself, not
  a forecast, in the results and in the method note.
- `reading.js` emits rule ids; `data/interpretations.js` answers them. A rule id
  with no prose is a test failure, not a silent gap.
- Aspect prose interpolates the two signs involved, so a trine between two air
  signs does not read like a trine between a fire and an air sign.
- No claim about accuracy appears on the page that the test suite does not
  demonstrate.

## 8. Experience requirements

**Accessibility.** Every input has a `<label>`, enforced by a test. The city
field is a real combobox: `role="combobox"`, `aria-expanded`, `aria-controls`,
`aria-activedescendant`, arrow keys, Enter, Escape, and `mousedown` selection so
the click lands before the input blurs. Errors are announced with `role="alert"`
and marked with `aria-invalid`, and cleared when the field is corrected. Focus
is visible. The reveal is never a gate: results are already in the DOM, motion
is skipped under `prefers-reduced-motion`, and focus moves to the results
rather than announcing twice.

**Responsive.** Mobile first, verified to 360 px, no horizontal scroll. Tables
that could overflow sit in a scroll container. One primary button per screen.

**Robustness.** No console errors or warnings on any path, including every error
state in §2.2. Storage failures, network failures, unknown timezones and
malformed dates are all tested.

**Theming.** All colour and spacing decisions are custom properties at the top
of `styles.css`, so a rebrand is a variable change, not a rewrite.

## 9. Testing

`node tests/run.js` — 191 tests across 14 suites, no framework. The runner is
async: a test may return a promise, it is awaited, and an unhandled rejection
fails the run.

| Suite | Covers |
| --- | --- |
| `math` | angle normalisation, signed differences, clamping |
| `time` | Julian day against Meeus ch. 7, sidereal time against Meeus 12.a, eight timezone cases including historical DST and both transition edges |
| `ephemeris` | Sun at the equinoxes and solstices, perihelion and aphelion distances, Meeus 25.a and 47.a, new and full moon, nutation |
| `planets` | Mercury, Venus, Mars, Jupiter and Saturn against JPL Horizons at two epochs, inside their own perihelion and aphelion, a cross-check of the Sun against the neighbouring module, and a retrograde station on the date JPL gives |
| `houses` | Ascendant and MC against an independent alt/az projection at five locations, whole sign invariants, house assignment over the whole circle |
| `zodiac` | the sign library's integrity and every boundary lookup |
| `chart` | full charts, timezone equivalence, birth-time sensitivity, solar noon, DST edge flags |
| `reading` | an 864-chart sweep across six timezones asserting no rule id is unanswered and no prose leaks `undefined` |
| `synastry` | the planets are placed only when asked for, the cross aspects are classified from the separation alone, the report is symmetric, and no score exists |
| `events` | four seasonal markers a year, moon phases against published times, ~160 ingresses that each really change the sign, Mercury stations against JPL, and the year filter |
| `geocode` | normalisation, ranking, caching, timeouts, failure modes, cache isolation, and that a failed search is reported as a failure rather than as no results |
| `integration` | every page's structure, script order, no build step, no external resources, labels, schema matching the FAQ, one `h1` each, and that no two pages share a title, description, canonical or `h1`, or that the hub repeats a tool page's copy |
| `pages` | both new pages rendered through their real page scripts against the stub DOM, including that no `undefined` or `NaN` reaches the page and that no orb is printed in the wrong unit |
| `ui` | the render path, including that no `undefined` or `NaN` reaches the page |

Reference values carry a citation in a comment. Where a value cannot be checked
against a publication, the test checks a physical invariant instead: the
equinoxes for the Sun, the distance minimum for perihelion, a known new moon
for the Moon, and an independently written projection of the sky onto the
horizon for the Ascendant. A remembered constant is not a reference.

That rule earned its place during this work. The first pass at the planetary
positions agreed with JPL to about 3″ for Mercury, and the remaining 20–40″ for
the other four looked like a missing aberration term. The remembered published
dates for Mercury retrogrades were worse: they were wrong, and the code was
right. Station dates were only trusted once JPL was scanned directly, which
moved the model from "about right" to within half an hour.

Two rules the suite exists to enforce, because both have already been broken
once: the markup and the scripts cannot drift apart, and no value may reach the
page as `undefined`.

**Adding a feature means adding a test.** If it has a rule in §2.0 or §2.2, that
rule is asserted by name somewhere in the suite.

## 10. Deployment

Static files. Any host that serves a directory will do — GitHub Pages, Netlify
drop, S3, or a plain `python -m http.server`. No build, no server, no
environment variables, nothing to keep secret.

Before going live, replace the `example.com` URLs in all four pages (canonical,
Open Graph, JSON-LD `@id`) and in `sitemap.xml` and `robots.txt`, with the real
domain. The suite checks that the URLs are *distinct and consistent with the
page*, not that the domain is the right one, so that step is manual.

## 11. Adding the next tool

1. The tool gets its own folder, `tools/<tool-name>/`, with its own
   `index.html`, reusing `css/` and `js/core/` by relative path.
2. Share code. If a new tool needs different behaviour from a `core` function,
   add an options object rather than copying the function.
3. Add a section to this spec, link the tool from the root `index.html`, and add
   it to `sitemap.xml`.
4. Add the page to `PAGES` in `tests/integration.test.js` with its exact title,
   canonical and script list. The suite will then hold the new page to the same
   accessibility, duplicate-content and asset-path rules as the others.
5. Give the page its own title, description and `h1`. The hub must describe the
   tool, not repeat it.
6. Extend §5 only if the new tool genuinely needs a new boundary. Three
   calculators should not each invent their own idea of what a Julian day is.

## 12. Definition of done

- `node tests/run.js` passes.
- Every acceptance criterion in §2.0 and §2.1 and every rule in §2.2 is either
  implemented and tested, or explicitly listed in §4.
- No console errors or warnings, on any path.
- Works from `file://`, keyboard only, at 360 px.
- No two pages share a title, description, canonical or `h1`.
- This file matches the code.

## 13. Change log

| Version | Change | Why |
| --- | --- | --- |
| 2.0 | Site becomes **Astrology**, a hub plus three tools. The Big Three moved to `tools/big-three/`. Added `tools/love-calculator/` (real synastry, deliberately no score) and `tools/astro-calendar/` (events solved, not tabulated). New `planets.js` and `vsop87d.js` for Venus, Mars and the retrograde stations; new `synastry.js` and `events.js`. The form widget takes an id prefix so two people fit on one page. Per-page titles, descriptions, canonicals and JSON-LD, plus `sitemap.xml` and `robots.txt`, with duplicate content now a failing test. | Two of the three features could not be added honestly without real planetary positions, and a single page could not carry three distinct search intents. |
| 1.1 | Spec restated as a product contract: feature inventory with acceptance criteria, a rules table for the awkward cases, and an explicit list of non-goals and accepted limitations. City search now reports a failed search as a failure rather than as no results. | Writing down the rules forced two gaps to be closed rather than described away. |
| 1.0 | First tool shipped. Whole sign houses, Meeus 25 and 47 positions, solar noon instead of 12:00 for an unknown birth time, SEO content, FAQPage schema. | — |

Bugs this spec was written against, kept here because each one produced a rule
above: the solar mean longitude was out by 180°; the daylight-saving detector
could not see a repeated hour; the solar-noon solver found the *lower* transit;
click handlers were passed to `setAttribute`; table rows were silently
stringified; the geocode cache leaked between clients; and the test runner did
not await async tests, so a suite reported passes it had never verified.

Found while building v2, each of which produced a test: the VSOP87 series return
radians and were being converted a second time, moving every planet by tens of
degrees; the moon-phase solver was finding the antipode as well as the target, so
every event was reported twice; the synastry pair list was directional, so one
person's Moon was never compared with the other person's Sun; `classify()` reports
geometry only, so reading `.harmony` and `.symbol` off its result produced
`undefined`; orbs were computed in arcminutes and labelled with a degree sign; and
the city combobox referenced an out-of-scope variable, so choosing a city threw.

