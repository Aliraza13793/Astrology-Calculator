'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const stub = require('./dom-stub');

const ROOT = path.join(__dirname, '..');

/* Every page the site ships, and the scripts it must load in order. Listing
   them here is what stops the markup and the scripts drifting apart: add a file
   to a page without adding it here and the suite fails. */
const PAGES = [
  {
    name: 'index.html',
    title: 'Astrology Calculators - Big Three, Compatibility, Calendar',
    canonical: 'https://astrology-calculator-ebon.vercel.app/',
    scripts: []
  },
  {
    name: 'tools/big-three/index.html',
    title: 'Sun, Moon & Rising Sign Calculator - Free Big Three Reading',
    canonical: 'https://astrology-calculator-ebon.vercel.app/tools/big-three/',
    scripts: [
      '../../js/config.js',
      '../../js/core/math.js',
      '../../js/core/time.js',
      '../../js/data/signs.js',
      '../../js/data/aspects.js',
      '../../js/data/interpretations.js',
      '../../js/core/ephemeris.js',
      '../../js/core/houses.js',
      '../../js/core/zodiac.js',
      '../../js/core/chart.js',
      '../../js/core/reading.js',
      '../../js/services/storage.js',
      '../../js/services/geocode.js',
      '../../js/ui/form.js',
      '../../js/ui/reveal.js',
      '../../js/ui/dom.js',
      '../../js/ui/results.js',
      '../../js/ui/app.js'
    ]
  },
  {
    name: 'tools/love-calculator/index.html',
    title: 'Love Compatibility Calculator - Real Synastry, Not a Score',
    canonical: 'https://astrology-calculator-ebon.vercel.app/tools/love-calculator/',
    scripts: [
      '../../js/config.js',
      '../../js/core/math.js',
      '../../js/core/time.js',
      '../../js/data/signs.js',
      '../../js/data/aspects.js',
      '../../js/data/interpretations.js',
      '../../js/data/synastry.js',
      '../../js/core/ephemeris.js',
      '../../js/core/vsop87d.js',
      '../../js/core/planets.js',
      '../../js/core/houses.js',
      '../../js/core/zodiac.js',
      '../../js/core/chart.js',
      '../../js/core/reading.js',
      '../../js/core/synastry.js',
      '../../js/services/storage.js',
      '../../js/services/geocode.js',
      '../../js/ui/form.js',
      '../../js/ui/dom.js',
      'app.js'
    ]
  },
  {
    name: 'tools/astro-calendar/index.html',
    title: 'Astrology Calendar 2026 - Equinoxes, Moon Phases, Retrogrades',
    canonical: 'https://astrology-calculator-ebon.vercel.app/tools/astro-calendar/',
    scripts: [
      '../../js/config.js',
      '../../js/core/math.js',
      '../../js/core/time.js',
      '../../js/data/signs.js',
      '../../js/data/aspects.js',
      '../../js/data/interpretations.js',
      '../../js/core/ephemeris.js',
      '../../js/core/vsop87d.js',
      '../../js/core/planets.js',
      '../../js/core/houses.js',
      '../../js/core/zodiac.js',
      '../../js/core/events.js',
      '../../js/ui/dom.js',
      'app.js'
    ]
  }
];

const HTML_OF = {};
for (const page of PAGES) {
  HTML_OF[page.name] = fs.readFileSync(path.join(ROOT, page.name), 'utf8');
}
const HTML = HTML_OF['tools/big-three/index.html'];
const env = stub.install();

/* Every id the page defines, so the tests below can build stub elements that
   match the real markup rather than a hand written list. */
const HTML_IDS = Array.from(HTML.matchAll(/\sid="([^"]+)"/g)).map((m) => m[1]);

function buildStubs() {
  for (const id of HTML_IDS) {
    const node = env.document.createElement('div');
    node.id = id;
    if (id === 'reveal') {
      const card = env.document.createElement('div');
      card.className = 'reveal-card';
      const caption = env.document.createElement('p');
      caption.className = 'reveal-caption';
      node.appendChild(card);
      node.appendChild(caption);
    }
    env.document.register(id, node);
  }
  return env.document;
}

describe('every page', () => {
  it('loads exactly the scripts listed for it, in dependency order', () => {
    for (const page of PAGES) {
      const scripts = Array.from(
        HTML_OF[page.name].matchAll(/<script src="([^"]+)"><\/script>/g)
      ).map((m) => m[1]);
      assert.deepStrictEqual(scripts, page.scripts, page.name + ' script list');
      for (const src of scripts) {
        assert.ok(
          fs.existsSync(path.join(ROOT, path.dirname(page.name), src)),
          page.name + ' lists ' + src + ' but it is missing'
        );
      }
    }
  });

  it('breaks no rule of the no build step constraint', () => {
    assert.ok(!/type="module"/.test(HTML), 'a module script would break file://');
    const sources = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.js') && full.indexOf('tests') === -1) {
          sources.push(full);
        }
      }
    };
    walk(path.join(ROOT, 'js'));
    walk(path.join(ROOT, 'tools'));
    assert.ok(sources.length >= 20, 'expected the full source tree');
    for (const file of sources) {
      const code = fs.readFileSync(file, 'utf8');
      const rel = path.relative(ROOT, file);
      assert.ok(!/^\s*import\s/m.test(code), rel + ' uses import');
      assert.ok(!/^\s*export\s/m.test(code), rel + ' uses export');
      assert.ok(!/\brequire\s*\(/.test(code), rel + ' uses require');
      assert.ok(!/\bclass\s+\w+/.test(code), rel + ' declares a class');
    }
  });

  it('has no external stylesheet, font or script on any page', () => {
    for (const page of PAGES) {
      const html = HTML_OF[page.name];
      /* The canonical link is a URL for search engines, not a resource the page
         loads, so it is removed before the check. */
      const withoutCanonical = html.replace(/<link[^>]*rel="canonical"[^>]*>/g, '');
      const external = Array.from(withoutCanonical.matchAll(/(?:src|href)="https?:\/\/[^"]+"/g));
      assert.deepStrictEqual(external.map((m) => m[0]), [], page.name + ' loads something remote');
    }
    const css = fs.readFileSync(path.join(ROOT, 'css/styles.css'), 'utf8');
    assert.ok(!/@import/.test(css));
    assert.ok(!/url\(\s*['"]?https?:/.test(css), 'the stylesheet loads something remote');
  });

  it('gives every form control on every page a label', () => {
    for (const page of PAGES) {
      const html = HTML_OF[page.name];
      const inputs = Array.from(html.matchAll(/<(input|select|textarea)\b[^>]*>/g)).map((m) => m[0]);
      for (const tag of inputs) {
        const id = /id="([^"]+)"/.exec(tag);
        assert.ok(id, page.name + ': a form control has no id: ' + tag);
        if (/type="(hidden|submit)"/.test(tag)) continue;
        const labelled = new RegExp('<label[^>]*for="' + id[1] + '"').test(html)
          || /aria-label/.test(tag)
          || /aria-labelledby/.test(tag);
        assert.ok(labelled, page.name + ': no label for ' + id[1]);
      }
    }
  });

  it('keeps the FAQ readable without JavaScript on every page that has one', () => {
    for (const page of PAGES) {
      const html = HTML_OF[page.name];
      const details = (html.match(/<details>/g) || []).length;
      if (!details) continue;
      const jsonLdFaq = (html.match(/"@type": "Question"/g) || []).length;
      assert.ok(details >= 5, page.name + ': expected the FAQ in static HTML');
      assert.strictEqual(details, jsonLdFaq,
        page.name + ': the FAQPage schema must match the questions on the page');
    }
  });

  it('describes every page for search engines', () => {
    for (const page of PAGES) {
      const html = HTML_OF[page.name];
      const title = /<title>([^<]*)<\/title>/.exec(html);
      assert.ok(title, page.name + ' has no title');
      /* Compare the text a reader sees, not the HTML entity. */
      const titleText = title[1].replace(/&amp;/g, '&');
      assert.strictEqual(titleText, page.title, page.name + ' title drifted');
      assert.ok(titleText.length >= 20 && titleText.length <= 70,
        page.name + ': title is ' + titleText.length + ' characters');
      const description = /name="description" content="([^"]*)"/.exec(html);
      assert.ok(description, page.name + ' has no meta description');
      assert.ok(description[1].length >= 80 && description[1].length <= 200,
        page.name + ': description is ' + description[1].length + ' characters');
      const canonical = /rel="canonical" href="([^"]+)"/.exec(html);
      assert.ok(canonical, page.name + ' has no canonical');
      assert.strictEqual(canonical[1], page.canonical, page.name + ' canonical drifted');
      assert.ok(/<html lang="en">/.test(html), page.name + ' needs a language');
      assert.ok(/name="viewport"/.test(html), page.name + ' needs a viewport');
      const h1s = html.match(/<h1[\s>]/g) || [];
      assert.strictEqual(h1s.length, 1, page.name + ' should have exactly one h1');
    }
  });

  it('offers a skip link and one primary call to action', () => {
    for (const page of PAGES) {
      const html = HTML_OF[page.name];
      assert.ok(/class="skip-link"/.test(html), page.name + ' has no skip link');
      const primary = (html.match(/class="btn"/g) || []).length;
      assert.ok(primary <= 1, page.name + ' has ' + primary + ' primary buttons');
    }
  });

  it('links every page back to the hub and to the other tools', () => {
    for (const page of PAGES) {
      if (page.name === 'index.html') continue;
      const html = HTML_OF[page.name];
      /* How many directories deep the page sits, so the relative path back to
         the root is built rather than hard coded per page. */
      const depth = page.name.split('/').length - 1;
      const up = '../'.repeat(depth);
      assert.ok(html.includes('href="' + up + '"'),
        page.name + ' has no link back to the hub');
      for (const other of PAGES.filter((p) => p.name !== 'index.html' && p.name !== page.name)) {
        /* Every tool page sits one directory below tools/, so a sibling link is
           ../<tool>/ whatever depth the current page is at. */
        const sibling = other.name.replace('tools/', '').replace('/index.html', '/');
        assert.ok(html.includes('href="../' + sibling + '"'),
          page.name + ' does not link to ' + other.name);
      }
    }
  });
});

/* Duplicate content is the failure mode a multi page site actually suffers
   from: three pages with the same title and description, or the hub quietly
   repeating a tool page's copy so that neither ranks. Both are checked here,
   because they are easy to introduce and invisible until search traffic
   arrives. */
describe('no duplicate content between pages', () => {
  const field = (html, pattern) => {
    const found = pattern.exec(html);
    return found ? found[1].trim() : null;
  };

  it('gives every page a different title, description and canonical', () => {
    const titles = new Set();
    const descriptions = new Set();
    const canonicals = new Set();
    for (const page of PAGES) {
      const html = HTML_OF[page.name];
      const title = field(html, /<title>([^<]*)<\/title>/);
      const description = field(html, /name="description" content="([^"]*)"/);
      const canonical = field(html, /rel="canonical" href="([^"]+)"/);
      assert.ok(!titles.has(title), 'title is shared: ' + title);
      assert.ok(!descriptions.has(description), 'description is shared by ' + page.name);
      assert.ok(!canonicals.has(canonical), 'canonical is shared: ' + canonical);
      titles.add(title);
      descriptions.add(description);
      canonicals.add(canonical);
    }
  });

  it('gives every page a different h1', () => {
    const heads = new Set();
    for (const page of PAGES) {
      const h1 = field(HTML_OF[page.name], /<h1[^>]*>([\s\S]*?)<\/h1>/);
      assert.ok(h1, page.name + ' has no h1');
      assert.ok(!heads.has(h1), 'h1 is shared: ' + h1);
      heads.add(h1);
    }
  });

  it('keeps the hub from repeating a tool page body copy', () => {
    const hub = HTML_OF['index.html'];
    for (const page of PAGES.filter((p) => p.name !== 'index.html')) {
      const tool = HTML_OF[page.name];
      /* Compare the prose of the main content region only, so shared
         boilerplate such as the footer is not counted against it. */
      const prose = (html) => {
        const body = html.split('<main>')[1] ? html.split('<main>')[1].split('</main>')[0] : '';
        return body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      };
      const shared = longestSharedRun(prose(hub), prose(page.name));
      assert.ok(shared < 240,
        'the hub repeats ' + shared + ' characters of ' + page.name);
    }
  });

  /* Longest run of words two passages share, as a cheap duplicate measure. */
  function longestSharedRun(a, b) {
    const words = (s) => s.split(' ').filter((w) => w.length > 3);
    const A = words(a);
    const B = new Set(words(b));
    let best = 0;
    let run = 0;
    for (const word of A) {
      if (B.has(word)) {
        run += 1;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    /* Words, doubled to a rough character count for the assertion. */
    return best * 6;
  }
});

describe('index.html', () => {
  it('is a hub, not a duplicate of a tool page', () => {
    const hub = HTML_OF['index.html'];
    /* The hub must not carry a calculator, or it competes with the page that
       does the job properly. */
    assert.ok(!/id="birth-form"/.test(hub), 'the hub should not carry the birth form');
    assert.ok(!/id="pair-form"/.test(hub), 'the hub should not carry the pair form');
    assert.ok(!/id="year-form"/.test(hub), 'the hub should not carry the year form');
    assert.ok(/id="tools"/.test(hub), 'the hub needs a tools section');
    assert.ok(/href="tools\/big-three\/"/.test(hub));
    assert.ok(/href="tools\/love-calculator\/"/.test(hub));
    assert.ok(/href="tools\/astro-calendar\/"/.test(hub));
  });

  it('lists the tools in structured data in the same order as on the page', () => {
    const hub = HTML_OF['index.html'];
    const inSchema = Array.from(hub.matchAll(/"position": (\d),[\s\S]*?"url": "([^"]+)"/g))
      .map((m) => m[2]);
    assert.strictEqual(inSchema.length, 3, 'expected three tools in the ItemList');
    assert.deepStrictEqual(inSchema, [
      'https://astrology-calculator-ebon.vercel.app/tools/big-three/',
      'https://astrology-calculator-ebon.vercel.app/tools/love-calculator/',
      'https://astrology-calculator-ebon.vercel.app/tools/astro-calendar/'
    ]);
    /* And the page must agree with its own structured data. */
    for (const url of inSchema) {
      assert.ok(hub.includes('href="' + url.replace('https://astrology-calculator-ebon.vercel.app/', '') + '"'),
        'the page does not link to ' + url);
    }
  });
});

describe('page wiring', () => {
  const document = buildStubs();

  globalThis.window = globalThis;
  /* Reduced motion, so the reveal resolves synchronously and the results are
     observable without waiting on a timer. */
  globalThis.window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
  document.readyState = 'complete';

  /* A fake localStorage, installed before app.js captures its reference, so the
     persistence path is exercised rather than skipped for want of a browser. */
  const storeData = {};
  const fakeLocalStorage = {
    getItem: (k) => (k in storeData ? storeData[k] : null),
    setItem: (k, v) => { storeData[k] = String(v); },
    removeItem: (k) => { delete storeData[k]; },
    clear: () => { for (const k of Object.keys(storeData)) delete storeData[k]; }
  };

  require(path.join(ROOT, 'js/ui/form.js'));
  require(path.join(ROOT, 'js/ui/reveal.js'));
  require(path.join(ROOT, 'js/ui/dom.js'));
  globalThis.SMRC.storage = globalThis.SMRC.createStorage(fakeLocalStorage);
  require(path.join(ROOT, 'js/ui/app.js'));

  const ui = globalThis.SMRC.ui;
  const el = (id) => document.getElementById(id);

  function fill(overrides) {
    const values = Object.assign({
      name: 'Alira',
      date: '1990-06-15',
      time: '14:30',
      unknown: false,
      place: {
        label: 'New York, United States',
        name: 'New York',
        latitude: 40.7128,
        longitude: -74.006,
        timezone: 'America/New_York'
      }
    }, overrides);
    el('name').value = values.name;
    el('date').value = values.date;
    el('time').value = values.time;
    el('time-unknown').checked = values.unknown;
    el('city').value = values.place.label;
    return values;
  }

  it('has an element for every id the scripts ask for', () => {
    assert.ok(el('birth-form'), 'missing the form');
    assert.ok(el('results'), 'missing the results region');
    assert.ok(el('reveal'), 'missing the reveal region');
    assert.ok(el('submit'), 'missing the submit button');
    for (const id of ['name', 'date', 'city', 'time', 'time-unknown', 'city-list',
      'city-hint', 'chosen-place', 'date-error', 'city-error', 'time-error']) {
      assert.ok(el(id), 'missing #' + id);
    }
  });

  it('rejects an empty form with a message on every field that needs one', () => {
    const outcome = ui.form.read(null);
    assert.strictEqual(outcome.ok, false);
    assert.ok(outcome.errors.date);
    assert.ok(outcome.errors.city);
    assert.ok(outcome.errors.time);
    assert.strictEqual(el('date-error').textContent, outcome.errors.date);
    assert.strictEqual(el('date').getAttribute('aria-invalid'), 'true');
  });

  it('rejects a city that was typed but never chosen', () => {
    fill();
    const outcome = ui.form.read(null);
    assert.strictEqual(outcome.ok, false);
    assert.ok(/Choose your city/.test(outcome.errors.city));
  });

  it('rejects an impossible date', () => {
    fill({ date: '1990-02-31' });
    const outcome = ui.form.read({
      latitude: 1, longitude: 1, timezone: 'UTC', label: 'Nowhere'
    });
    assert.strictEqual(outcome.ok, false);
    assert.ok(/does not exist/.test(outcome.errors.date));
  });

  it('rejects a year outside the supported range', () => {
    fill({ date: '1700-01-01' });
    const outcome = ui.form.read({ latitude: 1, longitude: 1, timezone: 'UTC', label: 'x' });
    assert.ok(/between 1800 and 2200/.test(outcome.errors.date));
  });

  it('reads a valid form into a chart input', () => {
    const values = fill();
    const outcome = ui.form.read({
      latitude: values.place.latitude,
      longitude: values.place.longitude,
      timezone: values.place.timezone,
      label: values.place.label
    });
    assert.strictEqual(outcome.ok, true);
    assert.strictEqual(outcome.birth.year, 1990);
    assert.strictEqual(outcome.birth.month, 6);
    assert.strictEqual(outcome.birth.day, 15);
    assert.strictEqual(outcome.birth.hour, 14);
    assert.strictEqual(outcome.birth.minute, 30);
    assert.strictEqual(outcome.birth.timeUnknown, false);
    assert.strictEqual(el('date').getAttribute('aria-invalid'), null);
  });

  it('defaults to noon and sets the flag when the time is unknown', () => {
    fill({ unknown: true, time: '' });
    const outcome = ui.form.read({ latitude: 1, longitude: 1, timezone: 'UTC', label: 'x' });
    assert.strictEqual(outcome.ok, true);
    assert.strictEqual(outcome.birth.timeUnknown, true);
    assert.strictEqual(outcome.birth.hour, 12);
  });

  it('runs the whole page on submit and fills the results region', () => {
    const values = fill();
    const city = ui.form.initCity();
    city.setPlace(values.place);
    /* The app installs its own handlers on load; call the calculation the same
       way a submit would. */
    const outcome = ui.form.read(city.getPlace());
    const chart = globalThis.SMRC.chart.compute(outcome.birth);
    const analysis = globalThis.SMRC.reading.analyse(chart);
    ui.results.render(el('results'), chart, analysis, { name: 'Alira', unknownTime: false });
    const all = el('results').textContent;
    assert.ok(/Alira, your Big Three/.test(all));
    assert.ok(/Gemini/.test(all));
    assert.ok(/whole-sign/.test(all));
    assert.strictEqual(el('results').hidden, false);
  });

  it('skips the animation when motion is not wanted', () => {
    let ran = false;
    ui.reveal.play(function () { ran = true; }, { motion: false, stepMs: 0 });
    assert.strictEqual(ran, true, 'the results must not wait on an animation');
    assert.strictEqual(el('reveal').hidden, false);
  });

  it('does not announce through a live region as well as through focus', () => {
    assert.ok(!/aria-live/.test(HTML.split('id="results"')[0].slice(-200)),
      'the results region should be reached by focus, not doubly announced');
  });

  it('calculates and renders on a real submit, through app.js', () => {
    const values = fill();
    el('results').hidden = true;
    el('results').textContent = '';
    /* The app owns one city controller; a test or a future control must use
       that one, not a second with its own state. */
    assert.ok(globalThis.SMRC.ui.app && globalThis.SMRC.ui.app.city);
    globalThis.SMRC.ui.app.city.setPlace(values.place);
    el('birth-form').dispatchEvent({ type: 'submit', preventDefault() {} });
    const all = el('results').textContent;
    assert.strictEqual(el('results').hidden, false);
    assert.ok(/Alira, your Big Three/.test(all), all.slice(0, 200));
    assert.ok(/Gemini/.test(all));
    assert.ok(/New York/.test(all));
    assert.strictEqual(el('submit').disabled, false, 'the button must be re-enabled');
    /* The last search is remembered without the name. */
    const saved = globalThis.SMRC.storage.get(globalThis.SMRC.config.storage.savedKey, null);
    assert.ok(saved && saved.timezone === 'America/New_York');
    assert.strictEqual(JSON.stringify(saved).indexOf('Alira'), -1,
      'the name must never be written to storage');
  });

  it('tells a failed city search apart from a search with no matches', () => {
    const message = ui.form.searchMessage;
    const offline = message({ results: [], failed: true, query: 'Zzz' }, 0);
    const noMatch = message({ results: [], failed: false, query: 'Zzz' }, 0);
    assert.ok(/unavailable/.test(offline), offline);
    assert.ok(/No city matches/.test(noMatch), noMatch);
    assert.notStrictEqual(offline, noMatch);
    assert.ok(/Zzz/.test(noMatch), 'the reader needs to see what was searched for');
    assert.ok(/1 city found/.test(message({ results: [{}], failed: false, query: 'a' }, 1)));
    assert.ok(/3 cities found/.test(message({ results: [{}, {}, {}], failed: false }, 3)));
  });

  it('refuses to calculate until a city is chosen, and says why', () => {
    const values = fill();
    el('results').hidden = true;
    el('results').textContent = '';
    globalThis.SMRC.ui.app.city.clear();
    el('city').value = values.place.label;
    el('birth-form').dispatchEvent({ type: 'submit', preventDefault() {} });
    assert.strictEqual(el('results').hidden, true, 'nothing should have rendered');
    assert.ok(/Choose your city/.test(el('city-error').textContent),
      el('city-error').textContent);
  });
});

