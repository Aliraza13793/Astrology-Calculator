'use strict';

const assert = require('assert');
const path = require('path');
const stub = require('./dom-stub');

/* The UI modules attach to window, so they are loaded with a fake global. */
const env = stub.install();
require(path.join(__dirname, '../js/ui/results.js'));
const C = globalThis.SMRC.chart;
const R = globalThis.SMRC.reading;
const results = globalThis.SMRC.ui.results;

const NEW_YORK = {
  timezone: 'America/New_York',
  latitude: 40.7128,
  longitude: -74.006
};

function chart(overrides) {
  return C.compute(Object.assign({
    year: 1990, month: 6, day: 15, hour: 14, minute: 30,
    placeName: 'New York, United States'
  }, NEW_YORK, overrides || {}));
}

function render(overrides, options) {
  const c = chart(overrides);
  const analysis = R.analyse(c);
  const host = env.document.createElement('div');
  results.render(host, Object.assign({}, c, { cautionBodies: analysis.caution }),
    analysis, options || {});
  return host;
}

function text(node) {
  return node.textContent.replace(/\s+/g, ' ');
}

describe('ui.results', () => {
  it('attaches event handlers as properties, not attributes', () => {
    const h = results.h;
    let ran = 0;
    const button = h('button', {
      type: 'button',
      class: 'btn',
      text: 'Go',
      onclick: function () { ran++; }
    });
    assert.strictEqual(typeof button.onclick, 'function',
      'setAttribute would stringify the handler and it would never fire');
    assert.strictEqual(button.getAttribute('type'), 'button');
    assert.strictEqual(button.className, 'btn');
    button.onclick();
    assert.strictEqual(ran, 1);
  });

  it('never appends a null child', () => {
    const h = results.h;
    const node = h('div', {}, [h('p', { text: 'a' }), null, undefined, 'tail']);
    assert.strictEqual(node.childNodes.length, 2);
  });

  it('renders a sign card for each of the three points', () => {
    const host = render();
    const cards = host.find('article');
    assert.strictEqual(cards.length, 3);
    const slots = cards.map((c) => c.find('p')[0].textContent);
    assert.deepStrictEqual(slots, ['Sun', 'Moon', 'Rising']);
    const all = text(host);
    assert.ok(all.indexOf('Gemini') !== -1, all.slice(0, 120));
    assert.ok(all.indexOf('Leo') !== -1 || all.indexOf('Libra') !== -1);
  });

  it('uses the sign specific text for each of the three points', () => {
    const c = chart();
    const host = render();
    const cards = host.find('article');
    const signs = globalThis.SMRC.data.signs;
    const sunText = signs[c.bodies.sun.signIndex].sun;
    const moonText = signs[c.bodies.moon.signIndex].moon;
    const risingText = signs[c.bodies.rising.signIndex].rising;
    assert.ok(text(cards[0]).indexOf(sunText.slice(0, 40)) !== -1, 'sun copy');
    assert.ok(text(cards[1]).indexOf(moonText.slice(0, 40)) !== -1, 'moon copy');
    assert.ok(text(cards[2]).indexOf(risingText.slice(0, 40)) !== -1, 'rising copy');
  });

  it('greets the reader by name when one was given', () => {
    const host = render({}, { name: 'Alira' });
    assert.ok(text(host).indexOf('Alira, your Big Three') !== -1);
    const plain = render();
    assert.ok(text(plain).indexOf('Your Big Three') !== -1);
    assert.ok(text(plain).indexOf(', your Big Three') === -1);
  });

  it('lists the degrees, houses and rulers in the table', () => {
    const host = render();
    const rows = host.find('tbody')[0].find('tr');
    assert.strictEqual(rows.length, 4);
    assert.strictEqual(rows[0].find('td')[0].textContent, 'Sun');
    assert.strictEqual(rows[3].find('td')[0].textContent, 'Midheaven (MC)');
    for (const row of rows) {
      const cells = row.find('td').map((td) => td.textContent);
      assert.strictEqual(cells.length, 7, JSON.stringify(cells));
      assert.ok(cells[1] && cells[2], JSON.stringify(cells));
      assert.ok(cells[6] && cells[6][0] === cells[6][0].toUpperCase(),
        'ruler should be capitalised: ' + cells[6]);
    }
  });

  it('describes the moon phase and both distances', () => {
    const host = render();
    const all = text(host);
    assert.ok(/% illuminated/.test(all), 'illumination missing');
    assert.ok(/km away/.test(all), 'distances missing');
  });

  it('warns that the Rising sign is unknown when the time is unknown', () => {
    const host = render({ timeUnknown: true });
    const all = text(host);
    assert.ok(all.indexOf('cannot be worked out') !== -1, all.slice(0, 200));
    assert.ok(/solar noon/.test(all));
    assert.ok(all.indexOf('1,480,000') === -1);
  });

  it('still shows a Rising card when the time is unknown, marked as such', () => {
    const host = render({ timeUnknown: true });
    const cards = host.find('article');
    assert.strictEqual(cards.length, 3);
    assert.ok(text(host).indexOf('treat the Moon sign as reliable') !== -1);
  });

  it('explains a repeated hour and a skipped hour', () => {
    const repeated = text(render({ year: 2024, month: 11, day: 3, hour: 1, minute: 30 }));
    assert.ok(repeated.indexOf('happened twice') !== -1, repeated.slice(0, 200));
    const skipped = text(render({ year: 2024, month: 3, day: 10, hour: 2, minute: 30 }));
    assert.ok(skipped.indexOf('never happened') !== -1, skipped.slice(0, 200));
  });

  it('warns when a body sits within half a degree of a sign boundary', () => {
    /* 15 March 1990 the Sun sits at 24.5 degrees of Pisces; find a case by
       scanning for a chart that trips the warning rather than inventing one. */
    let found = null;
    for (let day = 1; day <= 28 && !found; day += 1) {
      for (let minute = 0; minute < 60; minute += 1) {
        const c = chart({ month: 3, day: day, minute: minute });
        const analysis = R.analyse(c);
        if (analysis.caution.length) found = c;
      }
    }
    assert.ok(found, 'no cuspal chart found in the scan');
    const host = render({ month: found.input.month, day: found.input.day, minute: found.input.minute });
    const all = text(host);
    assert.ok(all.indexOf('Close to a sign boundary') !== -1, all.slice(0, 300));
    assert.ok(/from changing sign/.test(all));
  });

  it('reports the house system it used rather than implying Placidus', () => {
    const all = text(render());
    assert.ok(all.indexOf('whole-sign') !== -1, all.slice(-400));
    assert.ok(/Midheaven sits inside/.test(all));
  });

  it('includes the method note and the accuracy claim', () => {
    const all = text(render());
    assert.ok(all.indexOf('What went into this') !== -1);
    assert.ok(all.indexOf('daylight saving rules in force') !== -1);
    assert.ok(all.indexOf('arcsecond') !== -1 || all.indexOf('arcminute') !== -1);
  });

  it('never leaks an undefined or NaN into the page', () => {
    const cases = [
      {}, { timeUnknown: true }, { hour: 0, minute: 0 },
      { month: 12, day: 31, hour: 23, minute: 59 },
      { year: 1800, month: 1, day: 1, hour: 12 },
      { year: 2200, month: 12, day: 31, hour: 12 }
    ];
    for (const overrides of cases) {
      const all = text(render(overrides));
      assert.ok(!/undefined|NaN|\[object/.test(all),
        JSON.stringify(overrides) + ' -> ' + all.slice(0, 300));
    }
  });

  it('renders every rule in the sweep without throwing', () => {
    const places = [
      { timezone: 'Europe/London', latitude: 51.5, longitude: -0.13, placeName: 'London' },
      { timezone: 'Asia/Tokyo', latitude: 35.68, longitude: 139.69, placeName: 'Tokyo' },
      { timezone: 'America/Sao_Paulo', latitude: -23.55, longitude: -46.63, placeName: 'Sao Paulo' }
    ];
    for (const place of places) {
      for (let hour = 1; hour <= 23; hour += 7) {
        const host = env.document.createElement('div');
        const c = C.compute(Object.assign({
          year: 1988, month: 3, day: 21, hour: hour, minute: 5
        }, place));
        const analysis = R.analyse(c);
        results.render(host, Object.assign({}, c, { cautionBodies: analysis.caution }),
          analysis, {});
        const all = text(host);
        assert.ok(all.length > 800, 'too little text for ' + place.placeName);
        assert.ok(!/undefined|NaN|\[object/.test(all), all.slice(0, 300));
      }
    }
  });
});

/* The stub stays installed for the life of the process: the suite has no
   before/after hooks, and this file is the last one loaded. */
void env;
