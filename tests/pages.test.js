'use strict';
/* Renders the two new pages through their real page scripts against the DOM
   stub, so a broken reference, a missing element or a text that renders as
   "undefined" fails here rather than in a browser.

   The runner has no beforeEach, so each suite installs its DOM once and its
   assertions run in order against that one page. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const stub = require('./dom-stub');

const ROOT = path.join(__dirname, '..');

/* Each page gets its own document and its own fresh copy of the page scripts.
   The stub installs one shared document and the runner executes every describe
   body at load time, so without this the second page would replace the first
   page's elements and both suites would read the same node. */
function mount(pagePath, sources) {
  const html = fs.readFileSync(path.join(ROOT, pagePath), 'utf8');
  const env = stub.install({ fresh: true });
  const document = env.document;

  for (const match of html.matchAll(/<([a-z0-9]+)\b[^>]*\sid="([^"]+)"[^>]*>/gi)) {
    const [, tag, id] = match;
    const whole = match[0];
    const node = document.createElement(tag);
    /* The seed values an author wrote into the markup, so a page's own
       defaults are what the test sees rather than an empty stub. */
    const value = /\svalue="([^"]*)"/.exec(whole);
    if (value) node.value = value[1];
    if (/\schecked/.test(whole)) node.checked = true;
    if (/\shidden/.test(whole)) node.hidden = true;
    if (/\stype="number"/.test(whole)) node.type = 'number';
    if (/\stype="checkbox"/.test(whole)) node.type = 'checkbox';
    document.register(id, node);
  }

  globalThis.window = globalThis;
  globalThis.window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
  document.readyState = 'complete';

  for (const src of sources) {
    const full = path.join(ROOT, path.dirname(pagePath), src);
    delete require.cache[require.resolve(full)];
    require(full);
  }
  return document;
}

const el = (document, id) => document.getElementById(id);

const LONDON = {
  label: 'London, United Kingdom',
  latitude: 51.5074,
  longitude: -0.1278,
  timezone: 'Europe/London'
};
const LISBON = {
  label: 'Lisbon, Portugal',
  latitude: 38.7223,
  longitude: -9.1393,
  timezone: 'Europe/Lisbon'
};

const LOVE_SCRIPTS = [
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
];

const CALENDAR_SCRIPTS = [
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
];

describe('tools/love-calculator', () => {
  let document;
  let controller;

  it('exposes one city controller per person', () => {
    document = mount('tools/love-calculator/index.html', LOVE_SCRIPTS);
    controller = globalThis.SMRC.ui.love;
    assert.ok(controller, 'the page should expose a controller');
    assert.strictEqual(controller.cities.length, 2);
  });

  it('renders a comparison for two real charts', () => {
    el(document, 'a-name').value = 'Ada';
    el(document, 'a-date').value = '1990-06-15';
    el(document, 'a-time').value = '14:30';
    el(document, 'a-city').value = LONDON.label;
    el(document, 'b-name').value = 'Grace';
    el(document, 'b-date').value = '1992-11-03';
    el(document, 'b-time').value = '07:15';
    el(document, 'b-city').value = LISBON.label;
    controller.cities[0].setPlace(LONDON);
    controller.cities[1].setPlace(LISBON);

    el(document, 'pair-form').dispatchEvent({ type: 'submit', preventDefault() {} });

    const text = el(document, 'results').textContent;
    assert.strictEqual(el(document, 'results').hidden, false, 'results stayed hidden');
    assert.ok(/Ada/.test(text), 'the first name is missing: ' + text.slice(0, 200));
    assert.ok(/Grace/.test(text), 'the second name is missing');
    assert.ok(/off exact|arcsec/.test(text), 'no orb was reported');
    /* An orb is a fraction of a degree. A whole number printed with a degree
       sign means arcminutes were labelled as degrees, which overstates a tight
       orb by a factor of sixty. */
    assert.ok(!/(?<![.\d])\d° off exact/.test(text),
      'an orb was printed in the wrong unit: ' + text.match(/.{40}\d° off exact.{0,10}/));
    assert.ok(!/undefined/.test(text), 'an undefined leaked into the page');
    assert.ok(!/NaN/.test(text), 'NaN leaked into the page: ' + text);
  });

  it('never shows a compatibility percentage', () => {
    const text = el(document, 'results').textContent;
    assert.ok(!/\d+(\.\d+)?\s*%/.test(text), 'a percentage appeared in the results');
  });

  it('says plainly when a birth time is missing instead of guessing the Ascendant', () => {
    el(document, 'b-time-unknown').checked = true;
    el(document, 'b-time').value = '';
    el(document, 'pair-form').dispatchEvent({ type: 'submit', preventDefault() {} });
    const text = el(document, 'results').textContent;
    assert.ok(/Left out of this comparison/.test(text), text.slice(0, 300));
    assert.ok(/Ascendant/.test(text), 'the missing Ascendant was not named');
  });

  it('refuses to run when a city was typed but never chosen', () => {
    controller.cities[1].clear();
    el(document, 'b-city').value = 'Somewhere';
    el(document, 'results').hidden = true;
    el(document, 'pair-form').dispatchEvent({ type: 'submit', preventDefault() {} });
    assert.strictEqual(el(document, 'results').hidden, true, 'it rendered anyway');
    assert.ok(/Choose your city/.test(el(document, 'b-city-error').textContent),
      el(document, 'b-city-error').textContent);
  });
});

describe('tools/astro-calendar', () => {
  let document;

  it('renders a year of events with no undefined or NaN', () => {
    document = mount('tools/astro-calendar/index.html', CALENDAR_SCRIPTS);
    const text = el(document, 'results').textContent;
    assert.strictEqual(el(document, 'results').hidden, false, 'the year did not render');
    assert.ok(/astrology year \d{4}/.test(text), text.slice(0, 200));
    assert.ok(!/undefined/.test(text), 'an undefined leaked into the calendar');
    assert.ok(!/NaN/.test(text), 'NaN leaked into the calendar');
    assert.ok(/March Equinox/.test(text), 'no equinox on the calendar');
    assert.ok(/New Moon/.test(text), 'no new moon on the calendar');
    assert.ok(/turns retrograde|turns direct/.test(text), 'no stations on the calendar');
    assert.ok(/Moon enters /.test(text), 'no Moon ingresses on the calendar');
  });

  it('uses the year the page shipped with, not a blank field', () => {
    assert.ok(/astrology year 20\d\d/.test(el(document, 'results').textContent),
      'the page did not render its own default year');
  });

  it('groups the events under month headings', () => {
    const text = el(document, 'results').textContent;
    for (const month of ['January', 'March', 'June', 'September', 'December']) {
      assert.ok(text.indexOf(month) !== -1, 'no heading for ' + month);
    }
  });

  it('switches a category off without needing the button pressed again', () => {
    const before = el(document, 'results').textContent;
    el(document, 'f-ingress').checked = false;
    el(document, 'f-ingress').dispatchEvent({ type: 'change' });
    const after = el(document, 'results').textContent;
    assert.ok(/Moon enters /.test(before), 'the fixture should start with ingresses on');
    assert.ok(!/Moon enters /.test(after), 'ingresses survived being switched off');
    assert.ok(/March Equinox/.test(after), 'the other categories should remain');
  });

  it('rejects a year that is not a number', () => {
    el(document, 'year').value = 'soon';
    el(document, 'year-form').dispatchEvent({ type: 'submit', preventDefault() {} });
    assert.ok(/whole year/.test(el(document, 'year-error').textContent),
      el(document, 'year-error').textContent);
  });

  it('rejects a year outside the supported range', () => {
    el(document, 'year').value = '1700';
    el(document, 'year-form').dispatchEvent({ type: 'submit', preventDefault() {} });
    assert.ok(/between 1800 and 2200/.test(el(document, 'year-error').textContent),
      el(document, 'year-error').textContent);
  });

  it('switches everything off and says so rather than showing an empty page', () => {
    el(document, 'year').value = '2026';
    for (const id of ['f-solar', 'f-phase', 'f-ingress', 'f-station']) {
      el(document, id).checked = false;
      el(document, id).dispatchEvent({ type: 'change' });
    }
    const text = el(document, 'results').textContent;
    assert.ok(/Nothing selected/.test(text), text.slice(0, 200));
  });

  it('renders a year far from the present just as well', () => {
    el(document, 'year').value = '1901';
    el(document, 'year-form').dispatchEvent({ type: 'submit', preventDefault() {} });
    const text = el(document, 'results').textContent;
    assert.ok(/astrology year 1901/.test(text), text.slice(0, 120));
    assert.ok(!/undefined|NaN/.test(text), 'a bad year rendered an invalid value');
  });
});
