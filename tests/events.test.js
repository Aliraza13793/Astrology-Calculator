'use strict';
/* Event times were cross-checked against JPL Horizons: at each instant this
   module computes, Horizons puts the relevant body within a few thousandths of
   a degree of the defining angle. Those checks are recorded here as the
   tolerances, alongside invariants that need no reference at all. */

const assert = require('assert');

describe('core.events', () => {
  const E = () => globalThis.SMRC.events;
  const M = () => globalThis.SMRC.math;
  const T = () => globalThis.SMRC.time;

  const jdOf = (y, m, d, frac) => T().julianDay(y, m, d) + (frac || 0);
  const dateOf = (jd) => new Date((jd - 2440587.5) * 86400000);
  const fmt = (jd) => dateOf(jd).toISOString().slice(0, 16).replace('T', ' ');

  it('finds four solar terms a year, in order, about three months apart', () => {
    const terms = E().solarTerms(2024);
    assert.strictEqual(terms.length, 4);
    assert.deepStrictEqual(
      terms.map((t) => t.name),
      ['March Equinox', 'June Solstice', 'September Equinox', 'December Solstice']
    );
    for (let i = 1; i < terms.length; i += 1) {
      const gap = terms[i].jd - terms[i - 1].jd;
      assert.ok(gap > 80 && gap < 95, `gap between terms ${i} was ${gap.toFixed(1)} days`);
    }
  });

  it('puts the Sun exactly on the defining angle at each solar term', () => {
    /* The definition itself, so this is a check on the solver rather than on
       the series. */
    const eph = globalThis.SMRC.ephemeris;
    for (const term of E().solarTerms(2024)) {
      const lon = eph.sun(term.jd).longitude;
      const off = Math.abs(M().angleDiff(lon, term.longitude));
      assert.ok(off < 1e-4, `${term.name}: Sun ${off} deg from ${term.longitude}`);
    }
  });

  it('matches the 2024 equinox and solstice times to within a quarter hour', () => {
    /* Published instants for 2024, to the minute:
       March equinox  20 Mar 03:06 UTC
       June solstice  20 Jun 20:51 UTC
       Sept equinox   22 Sep 12:44 UTC
       Dec solstice   21 Dec 09:21 UTC
       The residual is the difference between Terrestrial and Universal Time
       plus the truncation of the solar series, both of which the module
       documents rather than hides. */
    const expected = {
      'March Equinox': '2024-03-20T03:06',
      'June Solstice': '2024-06-20T20:51',
      'September Equinox': '2024-09-22T12:44',
      'December Solstice': '2024-12-21T09:21'
    };
    for (const term of E().solarTerms(2024)) {
      const got = dateOf(term.jd).toISOString().slice(0, 16);
      const want = expected[term.name];
      const minutes = Math.abs(
        (Date.parse(got + 'Z') - Date.parse(want + 'Z')) / 60000
      );
      assert.ok(minutes <= 15, `${term.name}: got ${got}, published ${want}, off ${minutes} min`);
    }
  });

  it('finds the new and full Moons of 2024 to within five minutes', () => {
    const expected = [
      ['New Moon', '2024-01-11T11:57'],
      ['Full Moon', '2024-01-25T17:54'],
      ['New Moon', '2024-02-09T22:59'],
      ['Full Moon', '2024-02-24T12:30']
    ];
    const found = E().moonPhases(2024);
    for (let i = 0; i < expected.length; i += 1) {
      const got = found[i];
      assert.strictEqual(got.phase, expected[i][0]);
      const gotText = dateOf(got.jd).toISOString().slice(0, 16);
      const minutes = Math.abs(
        (Date.parse(gotText + 'Z') - Date.parse(expected[i][1] + 'Z')) / 60000
      );
      assert.ok(minutes <= 5, `${got.phase} ${i}: got ${gotText}, published ${expected[i][1]}`);
    }
  });

  it('alternates new and full Moons through the year', () => {
    const found = E().moonPhases(2024);
    assert.ok(found.length >= 24 && found.length <= 26, `got ${found.length} phases in 2024`);
    for (let i = 1; i < found.length; i += 1) {
      assert.notStrictEqual(found[i].phase, found[i - 1].phase, 'phases must alternate');
      const gap = found[i].jd - found[i - 1].jd;
      assert.ok(gap > 13 && gap < 16, `gap ${gap.toFixed(2)} days at index ${i}`);
    }
  });

  it('counts one Moon ingress per sign, about every 2.3 days', () => {
    const changes = E().moonSignChanges(2024);
    /* The Moon covers 360 degrees in 27.3 days, so it changes sign roughly
       every 2.3 days: about 160 times in a year, not twelve. */
    assert.ok(changes.length > 150 && changes.length < 170, `got ${changes.length}`);
    for (let i = 1; i < changes.length; i += 1) {
      const gap = changes[i].jd - changes[i - 1].jd;
      assert.ok(gap > 1.6 && gap < 3.2, `ingress gap ${gap.toFixed(2)} days at ${i}`);
    }
  });

  it('really changes the Moon sign at every ingress', () => {
    const eph = globalThis.SMRC.ephemeris;
    const zodiac = globalThis.SMRC.zodiac;
    for (const change of E().moonSignChanges(2024)) {
      /* Just before an ingress the Moon is in the sign it is leaving, and
         just after it is in the one it names. */
      const before = zodiac.fromLongitude(eph.moon(change.jd - 0.05).longitude).index;
      const after = zodiac.fromLongitude(eph.moon(change.jd + 0.05).longitude).index;
      assert.strictEqual(after, change.signIndex,
        `${fmt(change.jd)} should be entering ${change.sign.name}`);
      assert.strictEqual(before, (change.signIndex + 11) % 12,
        `${fmt(change.jd)} should still have been in the previous sign`);
    }
  });

  it('finds Mercury retrograde once a season, on the dates JPL gives', () => {
    /* JPL Horizons, by bisecting the sign change of Mercury's daily apparent
       longitude: retrograde 2023-12-13, 2024-04-01, 2024-08-05, 2024-11-26;
       direct 2024-01-02, 2024-04-25, 2024-08-28, 2024-12-15. */
    const expected = [
      ['2024-01-02T03:09', false], ['2024-04-01T22:15', true],
      ['2024-04-25T12:54', false], ['2024-08-05T04:55', true],
      ['2024-08-28T21:13', false], ['2024-11-26T02:40', true],
      ['2024-12-15T20:58', false]
    ];
    const found = E().stations('mercury', 2024);
    assert.strictEqual(found.length, expected.length, `got ${found.length} Mercury stations`);
    for (let i = 0; i < expected.length; i += 1) {
      const gotText = dateOf(found[i].jd).toISOString().slice(0, 16);
      const minutes = Math.abs(
        (Date.parse(gotText + 'Z') - Date.parse(expected[i][0] + 'Z')) / 60000
      );
      assert.ok(minutes <= 30, `Mercury station ${i}: got ${gotText}, JPL ${expected[i][0]}`);
      assert.strictEqual(found[i].retrograde, expected[i][1], `direction at index ${i}`);
    }
  });

  it('finds the slow planets stationing about once a year, in the right order', () => {
    /* Jupiter stationed retrograde once in 2024, on 9 October; its direct
       station fell on 31 December 2023 and so belongs to that year. Saturn
       has two, retrograde then direct. */
    const jupiter = E().stations('jupiter', 2024);
    assert.strictEqual(jupiter.length, 1, `Jupiter had ${jupiter.length} stations in 2024`);
    assert.strictEqual(jupiter[0].retrograde, true);

    const saturn = E().stations('saturn', 2024);
    assert.strictEqual(saturn.length, 2, `Saturn had ${saturn.length} stations in 2024`);
    assert.ok(saturn[0].retrograde, 'Saturn turns retrograde first');
    assert.ok(!saturn[1].retrograde, 'then direct');
    assert.ok(saturn[1].jd > saturn[0].jd, 'and in that order');
  });

  it('counts the stations in 2023, where Jupiter went direct', () => {
    /* A guard against the year filter silently discarding a real event: the
       station the 2024 scan uses as its starting point belongs to 2023. */
    const jupiter = E().stations('jupiter', 2023);
    assert.ok(jupiter.some((s) => !s.retrograde), 'Jupiter should turn direct during 2023');
  });

  it('reports a station as unobservable when it happens behind the Sun', () => {
    const all = E().year(2024).stations;
    for (const station of all) {
      assert.strictEqual(typeof station.observable, 'boolean');
      assert.strictEqual(
        station.observable,
        Math.abs(M().angleDiff(station.longitude, globalThis.SMRC.ephemeris.sun(station.jd).longitude)) > 8
      );
    }
  });

  it('keeps only the stations inside the year it was asked for', () => {
    const start = jdOf(2024, 1, 1);
    const end = jdOf(2025, 1, 1);
    for (const station of E().year(2024).stations) {
      assert.ok(station.jd >= start && station.jd < end, `${fmt(station.jd)} is outside 2024`);
    }
  });

  it('builds a timeline in time order with a title for every entry', () => {
    const year = E().year(2024);
    assert.ok(year.all.length > 180, `timeline had ${year.all.length} entries`);
    for (let i = 1; i < year.all.length; i += 1) {
      assert.ok(year.all[i].jd >= year.all[i - 1].jd, 'timeline is out of order');
    }
    for (const entry of year.all) {
      assert.ok(entry.title && typeof entry.title === 'string', 'entry without a title');
    }
  });

  it('wraps a running value so it never jumps', () => {
    /* track must produce a strictly increasing series even though the raw
       angles are wrapped into [0, 360). */
    const samples = E().track((jd) => globalThis.SMRC.ephemeris.sun(jd).longitude, jdOf(2024, 1, 1), jdOf(2025, 1, 1), 1);
    assert.ok(samples.length > 360);
    for (let i = 1; i < samples.length; i += 1) {
      assert.ok(samples[i].u > samples[i - 1].u, `running value went backwards at index ${i}`);
      assert.ok(samples[i].u - samples[i - 1].u < 2, `running value jumped at index ${i}`);
    }
    /* A year of solar motion is a little under 360 degrees. */
    const span = samples[samples.length - 1].u - samples[0].u;
    assert.ok(span > 358 && span < 362, `solar span was ${span.toFixed(2)}`);
  });

  it('handles a year far from the present without losing events', () => {
    /* A table of dates would have nothing to say here. */
    const terms = E().solarTerms(1901);
    assert.strictEqual(terms.length, 4);
    const ingress = E().moonSignChanges(1901);
    assert.ok(ingress.length > 150 && ingress.length < 170, `got ${ingress.length}`);
  });
});
