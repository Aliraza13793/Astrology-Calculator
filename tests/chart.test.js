'use strict';

const assert = require('assert');
const C = globalThis.SMRC.chart;
const R = globalThis.SMRC.reading;
const M = globalThis.SMRC.math;

const BASE = {
  timezone: 'America/New_York',
  latitude: 40.7128,
  longitude: -74.006
};

function chartFor(overrides) {
  return C.compute(Object.assign({ year: 1990, month: 6, day: 15, hour: 14, minute: 30 }, BASE, overrides));
}

describe('chart.compute', () => {
  it('produces a full Big Three for a New York birth', () => {
    const chart = chartFor({});
    /* The Sun is in Gemini for the whole second half of June, which is checkable
       without an ephemeris. */
    assert.strictEqual(chart.bodies.sun.sign.name, 'Gemini');
    assert.strictEqual(chart.bodies.rising.house, 1);
    assert.strictEqual(chart.bodies.rising.sign.name, 'Libra');
    assert.strictEqual(chart.bodies.moon.sign.name, 'Pisces');
    assert.ok(chart.houses.cusps.length === 12);
    assert.strictEqual(chart.houses.system, 'whole-sign');
    assert.strictEqual(chart.moment.utcOffsetMinutes, -240);
    assert.strictEqual(chart.moment.utcLabel, '1990-06-15T18:30:00.000Z');
  });

  it('puts an afternoon Sun within thirty degrees of the Midheaven', () => {
    const chart = chartFor({});
    const off = Math.abs(M.angleDiff(chart.sun.longitude, chart.angles.mc));
    assert.ok(off < 30, 'Sun to MC separation ' + off);
    /* Whole sign means the house number depends on the Ascendant, not on how
       close the Sun is to the meridian, so only the geometry is asserted. */
    assert.ok([8, 9, 10, 11].includes(chart.bodies.sun.house), 'house ' + chart.bodies.sun.house);
  });

  it('agrees with the ephemeris it is wired to', () => {
    const chart = chartFor({});
    const jd = chart.moment.jd;
    assert.ok(
      Math.abs(M.angleDiff(chart.sun.longitude, globalThis.SMRC.ephemeris.sun(jd).longitude)) < 1e-12
    );
    assert.ok(
      Math.abs(M.angleDiff(chart.moon.longitude, globalThis.SMRC.ephemeris.moon(jd).longitude)) < 1e-12
    );
    assert.strictEqual(chart.houses.cusps[0], chart.angles.ascendant);
  });

  it('resolves the same instant from different time zones', () => {
    const ny = chartFor({});
    const utc = chartFor({ timezone: 'UTC', hour: 18, minute: 30 });
    assert.ok(
      Math.abs(M.angleDiff(ny.bodies.sun.longitude, utc.bodies.sun.longitude)) < 1e-9
    );
    assert.ok(
      Math.abs(M.angleDiff(ny.bodies.rising.longitude, utc.bodies.rising.longitude)) < 1e-9
    );
  });

  it('is unaffected by the name of the city, only by its coordinates', () => {
    const a = chartFor({ placeName: 'New York' });
    const b = chartFor({ placeName: 'Manhattan' });
    assert.ok(
      Math.abs(M.angleDiff(a.bodies.rising.longitude, b.bodies.rising.longitude)) < 1e-12
    );
  });

  it('moves the Rising sign by roughly a quarter of a degree a minute', () => {
    const a = chartFor({ minute: 0 });
    const b = chartFor({ minute: 1 });
    const drift = Math.abs(M.angleDiff(a.bodies.rising.longitude, b.bodies.rising.longitude));
    /* The rate in ecliptic longitude depends on latitude and on where the
       Ascendant happens to be, so this is a band and not a point. */
    assert.ok(drift > 0.15 && drift < 0.30, 'drift ' + drift);
    const moonDrift = Math.abs(
      M.angleDiff(a.bodies.moon.longitude, b.bodies.moon.longitude)
    );
    assert.ok(moonDrift > 0.0085 && moonDrift < 0.0095, 'moon drift ' + moonDrift);
  });

  it('says how much birth time error it would take to change a sign', () => {
    const chart = chartFor({});
    assert.ok(chart.uncertainty.risingMinutesPerDegree > 3);
    assert.ok(chart.uncertainty.risingMinutesPerDegree < 5);
    assert.ok(chart.uncertainty.moonMinutesPerDegree > 90);
  });

  it('finds local solar noon, not local clock noon', () => {
    /* New York sits far west of the meridian its timezone uses, so solar noon
       arrives nearly an hour later on the clock. */
    const noon = C.solarNoon('America/New_York', 40.7128, -74.006, 1990, 6, 15);
    assert.strictEqual(noon.offsetLabel, '-04:00');
    assert.ok(
      Math.abs(noon.minutesFromClockNoon - 57) <= 2,
      'minutes ' + noon.minutesFromClockNoon
    );

    /* Tokyo sits east of the JST meridian, so it happens early. */
    const tokyo = C.solarNoon('Asia/Tokyo', 35.68, 139.69, 2024, 6, 21);
    assert.strictEqual(tokyo.localLabel, '11:43');

    /* The prime meridian has almost nothing left in the equation of time. */
    const greenwich = C.solarNoon('UTC', 51.4779, 0, 2024, 12, 21);
    assert.ok(
      Math.abs(greenwich.minutesFromClockNoon) < 5,
      'Greenwich ' + greenwich.minutesFromClockNoon
    );
  });

  it('uses solar noon when the birth time is unknown', () => {
    const chart = chartFor({ timeUnknown: true });
    assert.ok(chart.solarNoon);
    assert.strictEqual(chart.moment.utcOffsetMinutes, -240);
    /* The moment actually used is the solved solar noon, not 12.00. */
    assert.notStrictEqual(chart.moment.utcLabel, '1990-06-15T16:00:00.000Z');
  });

  it('flags an unknown birth time and withholds the margins that depend on it', () => {
    const chart = chartFor({ timeUnknown: true });
    assert.strictEqual(chart.uncertainty.timeUnknown, true);
    assert.strictEqual(chart.uncertainty.risingMarginDeg, null);
    assert.strictEqual(chart.moment.timeUnknown, true);
  });

  it('flags a local time that fell in a skipped or repeated hour', () => {
    const ambiguous = chartFor({ year: 2024, month: 11, day: 3, hour: 1, minute: 30 });
    assert.strictEqual(ambiguous.moment.ambiguousLocalTime, true);
    const missing = chartFor({ year: 2024, month: 3, day: 10, hour: 2, minute: 30 });
    assert.strictEqual(missing.moment.nonexistentLocalTime, true);
  });

  it('reports the moon phase', () => {
    const chart = chartFor({ year: 2024, month: 5, day: 23, hour: 9, minute: 53 });
    assert.ok(Math.abs(chart.moon.phase - 0.5) < 0.01, 'phase ' + chart.moon.phase);
    assert.ok(chart.moon.illumination > 0.95, 'illumination ' + chart.moon.illumination);
    assert.strictEqual(chart.moon.phaseName, 'Full Moon');
  });

  it('labels a body sitting next to a sign boundary', () => {
    const chart = chartFor({});
    for (const key of ['sun', 'moon', 'rising']) {
      const body = chart.bodies[key];
      assert.ok(body.cuspMargin > 0 && body.cuspMargin <= 15, key + ' margin ' + body.cuspMargin);
      assert.ok(body.longitudeText.indexOf(body.sign.name) !== -1, key);
      assert.ok(/^\d+\u00B0\d+\u2032$/.test(body.degreeText), key + ' ' + body.degreeText);
    }
  });
});

describe('reading.analyse', () => {
  it('classifies separations into aspects within the configured orbs', () => {
    assert.strictEqual(R.classify(0).name, 'conjunction');
    assert.strictEqual(R.classify(3).name, 'conjunction');
    assert.strictEqual(R.classify(60).name, 'sextile');
    assert.strictEqual(R.classify(90).name, 'square');
    assert.strictEqual(R.classify(120).name, 'trine');
    assert.strictEqual(R.classify(150).name, 'quincunx');
    assert.strictEqual(R.classify(180).name, 'opposition');
    assert.strictEqual(R.classify(35), null);
  });

  it('finds the three Big Three aspects for a real chart', () => {
    const chart = chartFor({});
    const analysis = R.analyse(chart);
    assert.ok(analysis.pairs.length <= 3);
    for (const pair of analysis.pairs) {
      assert.ok(pair.aspect && pair.aspect.name);
      assert.ok(pair.strength >= 0 && pair.strength <= 1);
      assert.ok(['sun-moon', 'sun-rising', 'moon-rising'].includes(pair.key));
    }
  });

  it('counts elements, modalities and polarities across the three points', () => {
    const chart = chartFor({});
    const analysis = R.analyse(chart);
    const total = ['fire', 'earth', 'air', 'water'].reduce(
      (sum, e) => sum + (analysis.elements.counts[e] || 0), 0
    );
    assert.strictEqual(total, 3);
    assert.ok(analysis.elements.dominant);
    assert.ok(analysis.elements.missing.length >= 1);
    assert.ok(analysis.modalities.dominant);
  });

  it('always produces rule ids that the content layer can answer', () => {
    const chart = chartFor({});
    const analysis = R.analyse(chart);
    const known = globalThis.SMRC.data.interpretations;
    const prefixRules = [
      'element-balanced', 'element-two-same', 'element-all-same',
      'axis-hot', 'axis-cool',
      'polarity-split', 'polarity-yang', 'polarity-yin',
      'all-three-same', 'two-of-a-kind',
      'dispositor-sun', 'dispositor-moon', 'dispositor-rising',
      'dispositor-elsewhere', 'dispositor-own-sign',
      'rising-equals-sun', 'rising-equals-moon', 'sun-equals-moon'
    ];
    for (const rule of analysis.rules) {
      if (known[rule]) continue;
      if (rule.startsWith('aspect-')) continue;
      if (prefixRules.includes(rule)) continue;
      assert.fail('unknown rule id: ' + rule);
    }
    for (const rule of analysis.rules) {
      if (known[rule]) {
        const text = known[rule].body({ chart: chart, analysis: analysis });
        assert.strictEqual(typeof text, 'string', rule);
        assert.ok(text.length > 20, rule + ' is too short to be useful');
        assert.ok(!/undefined|\[object/.test(text), rule + ' leaked a bad value: ' + text);
      }
    }
  });

  it('has prose for the element and modality rules it can emit', () => {
    for (const key of ['element-balanced', 'element-two-same', 'element-all-same']) {
      assert.ok(globalThis.SMRC.data.interpretations[key], key);
    }
    for (const mode of ['cardinal', 'fixed', 'mutable']) {
      assert.ok(globalThis.SMRC.data.interpretations['modality-' + mode], mode);
    }
  });

  it('finds the dispositor of the Rising sign in the Big Three or not', () => {
    const chart = chartFor({});
    const analysis = R.analyse(chart);
    assert.strictEqual(analysis.dispositor.planet, chart.bodies.rising.sign.rulers[0]);
    assert.ok(['sun', 'moon', 'rising', 'elsewhere'].includes(analysis.dispositor.location));
  });

  it('warns only about bodies genuinely near a cusp', () => {
    const chart = chartFor({});
    const analysis = R.analyse(chart);
    for (const body of analysis.caution) {
      assert.ok(body.cuspMargin < 0.5, body.label + ' margin ' + body.cuspMargin);
    }
  });
});
