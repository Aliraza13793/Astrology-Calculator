'use strict';

const assert = require('assert');
const C = globalThis.SMRC.chart;
const R = globalThis.SMRC.reading;
const M = globalThis.SMRC.math;
const INTERP = globalThis.SMRC.data.interpretations;
const ASPECTS = globalThis.SMRC.data.aspects;

const TZS = [
  { timezone: 'Europe/London', latitude: 51.5, longitude: -0.13 },
  { timezone: 'Asia/Tokyo', latitude: 35.68, longitude: 139.69 },
  { timezone: 'Australia/Sydney', latitude: -33.87, longitude: 151.21 },
  { timezone: 'America/Sao_Paulo', latitude: -23.55, longitude: -46.63 },
  { timezone: 'Asia/Kolkata', latitude: 28.61, longitude: 77.21 },
  { timezone: 'Africa/Nairobi', latitude: -1.29, longitude: 36.82 }
];

let charts = null;

function sweep() {
  var out = [];
  for (var i = 0; i < TZS.length; i++) {
    for (var month = 1; month <= 12; month++) {
      for (var day = 1; day <= 28; day += 9) {
        for (var hour = 2; hour <= 22; hour += 8) {
          out.push(C.compute(Object.assign({
            year: 1975 + (i * 3),
            month: month,
            day: day,
            hour: hour,
            minute: 20
          }, TZS[i])));
        }
      }
    }
  }
  return out;
}

function allCharts() {
  if (charts === null) charts = sweep();
  return charts;
}

describe('reading.sweep', () => {
  var charts = allCharts();

  it('produces a chart for every swept moment', () => {
    assert.strictEqual(charts.length, TZS.length * 12 * 4 * 3);
    for (const chart of charts) {
      assert.ok(isFinite(chart.bodies.sun.longitude));
      assert.ok(isFinite(chart.bodies.moon.longitude));
      assert.ok(isFinite(chart.bodies.rising.longitude));
      assert.ok(chart.bodies.rising.sign);
      assert.ok(chart.houses.cusps.length === 12);
    }
  });

  it('never emits a rule the content layer cannot answer', () => {
    const aspectRule = /^aspect-(sun-moon|sun-rising|moon-rising)-[a-z]+/;
    for (const chart of charts) {
      const analysis = R.analyse(chart);
      for (const rule of analysis.rules) {
        if (rule.startsWith('aspect-')) {
          assert.ok(aspectRule.test(rule), 'malformed aspect rule: ' + rule);
          continue;
        }
        assert.ok(INTERP[rule], 'missing prose for rule: ' + rule);
      }
    }
  });

  it('produces clean prose for every chart in the sweep', () => {
    for (const chart of charts) {
      const analysis = R.analyse(chart);
      for (const rule of analysis.rules) {
        if (!INTERP[rule]) continue;
        const text = INTERP[rule].body({ chart: chart, analysis: analysis });
        assert.ok(text.length > 40, rule + ' too short: ' + text);
        assert.ok(!/undefined|NaN|\[object/.test(text), rule + ': ' + text);
      }
      for (const pair of analysis.pairs) {
        const text = ASPECTS[pair.aspect.name].describe(pair.a.sign, pair.b.sign);
        assert.ok(text.length > 60, pair.key + ' ' + pair.aspect.name + ' too short');
        assert.ok(!/undefined|NaN|\[object/.test(text), text);
      }
    }
  });

  it('covers every sign as a Rising sign with its own dispositor prose', () => {
    const seen = {};
    for (const chart of charts) {
      const rising = chart.bodies.rising;
      if (seen[rising.sign.name]) continue;
      seen[rising.sign.name] = true;
      const analysis = R.analyse(chart);
      const rule = 'dispositor-' + analysis.dispositor.location;
      assert.ok(INTERP[rule], rising.sign.name + ' -> ' + rule);
      const text = INTERP[rule].body({ chart: chart, analysis: analysis });
      assert.ok(!/undefined/.test(text), text);
      assert.strictEqual(analysis.dispositor.planet, rising.sign.rulers[0]);
    }
    assert.strictEqual(Object.keys(seen).length, 12);
  });

  it('keeps the Rising sign within a sign of the whole sign sweep', () => {
    const counts = {};
    for (const chart of charts) {
      counts[chart.bodies.rising.sign.name] = true;
    }
    assert.ok(Object.keys(counts).length > 8, 'only saw ' + Object.keys(counts).length);
  });
});

describe('reading.dispositor', () => {
  it('finds charts where the Sun is the ruler of the Rising sign', () => {
    const found = allCharts().filter((c) => R.analyse(c).dispositor.location === 'sun');
    assert.ok(found.length > 0, 'no chart in the sweep had the Sun as dispositor');
    for (const chart of found) {
      const analysis = R.analyse(chart);
      assert.strictEqual(
        globalThis.SMRC.zodiac.signsRuledBy(analysis.dispositor.planet)[0],
        chart.bodies.sun.signIndex
      );
    }
  });

  it('marks mutual reception when the Moon rules its own Rising sign', () => {
    const found = allCharts().filter((c) =>
      c.bodies.rising.sign.name === 'Cancer'
      && c.bodies.moon.signIndex === c.bodies.rising.signIndex);
    if (found.length === 0) return;
    const analysis = R.analyse(found[0]);
    assert.strictEqual(analysis.dispositor.location, 'moon');
    assert.strictEqual(analysis.dispositor.inOwnSign, true);
    assert.ok(analysis.rules.includes('rising-equals-moon'));
  });

  it('does not confuse the first ruler with the traditional one', () => {
    for (const chart of allCharts()) {
      const rising = chart.bodies.rising;
      const expected = rising.sign.rulers[0];
      assert.strictEqual(R.analyse(chart).dispositor.planet, expected);
    }
  });
});

void M;
