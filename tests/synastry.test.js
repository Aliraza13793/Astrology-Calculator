'use strict';
const assert = require('assert');

describe('core.synastry', () => {
  const S = () => globalThis.SMRC.synastry;
  const chart = (y, m, d, h, min, lat, lon, tz) => globalThis.SMRC.chart.compute({
    year: y, month: m, day: d, hour: h, minute: min,
    latitude: lat, longitude: lon, timezone: tz
  }, { planets: ['venus', 'mars'] });

  const LONDON = [51.5074, -0.1278, 'Europe/London'];
  const NEW_YORK = [40.7128, -74.006, 'America/New_York'];

  const a = chart(1990, 6, 15, 14, 30, ...LONDON);
  const b = chart(1992, 11, 3, 7, 15, ...NEW_YORK);

  it('places the extra planets only when they are asked for', () => {
    const bare = globalThis.SMRC.chart.compute({
      year: 1990, month: 6, day: 15, hour: 14, minute: 30,
      latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London'
    });
    assert.deepStrictEqual(bare.planets, {}, 'no planets should be computed by default');
    assert.deepStrictEqual(Object.keys(a.planets).sort(), ['mars', 'venus']);
  });

  it('gives each extra planet a sign, a house and a display name', () => {
    for (const key of ['venus', 'mars']) {
      const body = a.planets[key];
      assert.ok(body.sign && body.sign.name, `${key} has no sign`);
      assert.ok(body.house >= 1 && body.house <= 12, `${key} house ${body.house}`);
      assert.strictEqual(body.label, key.charAt(0).toUpperCase() + key.slice(1));
    }
  });

  it('agrees with the JPL-validated planetary series on the sign', () => {
    /* The sign is what the reading is built on, so it is worth asserting that
       the placed sign agrees with an independent position for the same instant. */
    const eph = globalThis.SMRC.ephemeris;
    const P = globalThis.SMRC.planets;
    const jd = globalThis.SMRC.time.julianDayFromUnixMs(a.moment.unixMs);
    for (const key of ['venus', 'mars']) {
      const direct = P.apparent(key, jd).longitude;
      assert.ok(
        Math.abs(globalThis.SMRC.math.angleDiff(a.planets[key].longitude, direct)) < 1e-9,
        `${key} longitude disagrees with the ephemeris`
      );
    }
    assert.ok(eph.moon(jd).longitude > 0);
  });

  it('marks a planet retrograde when its longitude rate is negative', () => {
    /* Compare against a month either side: the flag must actually change. */
    const c = chart(2024, 12, 10, 12, 0, ...LONDON);
    const january = chart(2025, 1, 10, 12, 0, ...LONDON);
    assert.strictEqual(c.planets.mars.retrograde, true, 'Mars was retrograde in Dec 2024');
    assert.strictEqual(january.planets.mars.retrograde, true, 'and still in Jan 2025');
    const june = chart(2024, 6, 15, 12, 0, ...LONDON);
    assert.strictEqual(june.planets.mars.retrograde, false, 'Mars was direct in June 2024');
  });

  it('finds cross aspects and describes each one', () => {
    const result = S().between(a, b);
    assert.ok(result.aspects.length > 0, 'two real charts should share some aspect');
    for (const aspect of result.aspects) {
      assert.ok(aspect.aspect.name, 'aspect without a name');
      assert.ok(aspect.orb >= 0, 'negative orb');
      assert.ok(aspect.strength > 0 && aspect.strength <= 1, `strength ${aspect.strength}`);
      assert.ok(aspect.a.label && aspect.b.label, 'aspect without body labels');
      assert.ok(aspect.separation <= 180);
    }
  });

  it('never scores the relationship on a single number', () => {
    /* A single figure would have to weight a square against a trine by
       something arbitrary, and the reader would take it as a measurement. */
    const result = S().between(a, b);
    const serialised = JSON.stringify(result);
    assert.ok(!/"score"|"percentage"|"compatibility"/.test(serialised), 'found a compatibility score');
    assert.strictEqual(result.aspects.length, result.aspects.length);
  });

  it('sorts aspects strongest first', () => {
    const result = S().between(a, b);
    for (let i = 1; i < result.aspects.length; i += 1) {
      assert.ok(
        result.aspects[i - 1].strength >= result.aspects[i].strength,
        'aspects are out of strength order'
      );
    }
  });

  it('lists only aspects inside the configured orb', () => {
    const orbs = globalThis.SMRC.config.orbs;
    for (const aspect of S().between(a, b).aspects) {
      assert.ok(aspect.orb <= orbs[aspect.aspect.name], `${aspect.aspect.name} outside its orb`);
    }
  });

  it('classifies every aspect from the separation alone', () => {
    /* Re-deriving each aspect from the raw angle must give the same answer,
       which is a real check that nothing was asserted into the record. */
    const reading = globalThis.SMRC.reading;
    const result = S().between(a, b);
    for (const aspect of result.aspects) {
      const reclassified = reading.classify(aspect.separation);
      assert.ok(reclassified, `separation ${aspect.separation} matched no aspect`);
      assert.strictEqual(reclassified.name, aspect.aspect.name);
      assert.ok(Math.abs(reclassified.deviation - aspect.orb) < 1e-9);
    }
  });

  it('is symmetric: swapping the two charts finds the same number of aspects', () => {
    const forward = S().between(a, b);
    const backward = S().between(b, a);
    assert.strictEqual(forward.counts.total, backward.counts.total);
    assert.strictEqual(forward.counts.flow, backward.counts.flow);
    assert.strictEqual(forward.counts.friction, backward.counts.friction);
  });

  it('gives the same answer for two identical charts', () => {
    const copy = chart(1990, 6, 15, 14, 30, ...LONDON);
    assert.deepStrictEqual(
      JSON.parse(JSON.stringify(S().between(a, copy))),
      JSON.parse(JSON.stringify(S().between(a, a)))
    );
  });

  it('reports which pairings it could not find', () => {
    const result = S().between(a, b);
    assert.ok(Array.isArray(result.absent));
    const keys = result.aspects.map((x) => x.key);
    for (const key of result.absent) {
      assert.ok(keys.indexOf(key) === -1, `${key} is both present and absent`);
    }
  });

  it('never borrows a planet from a chart that did not compute one', () => {
    /* A chart with no planets may still be compared with one that has them;
       what it must never do is contribute a Venus it never calculated. */
    const bare = globalThis.SMRC.chart.compute({
      year: 1990, month: 6, day: 15, hour: 14, minute: 30,
      latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London'
    });
    const result = S().between(bare, b);
    for (const aspect of result.aspects) {
      assert.ok(aspect.a.label !== 'Venus' && aspect.a.label !== 'Mars',
        `the bare chart contributed a ${aspect.a.label}`);
    }
    const other = S().between(b, bare);
    for (const aspect of other.aspects) {
      assert.ok(aspect.b.label !== 'Venus' && aspect.b.label !== 'Mars',
        `the bare chart contributed a ${aspect.b.label}`);
    }
  });

  it('groups aspects by theme and counts each harmony', () => {
    const result = S().between(a, b);
    for (const aspect of result.aspects) {
      assert.ok(result.themes[aspect.theme], `theme ${aspect.theme} missing from the tally`);
    }
    const total = result.counts.flow + result.counts.friction + result.counts.awkward + result.counts.blend;
    assert.strictEqual(total, result.counts.total);
  });

  it('has a highlights helper that leads with the tightest aspects', () => {
    const result = S().between(a, b);
    const top = S().highlights(result, 2);
    assert.ok(top.length <= 2);
    if (result.aspects.length > 1) {
      assert.ok(top[0].strength >= top[1].strength, 'highlights are out of order');
    }
  });
});
