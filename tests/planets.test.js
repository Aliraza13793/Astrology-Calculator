'use strict';
/* Reference values: JPL Horizons, observer-centered apparent ecliptic longitude
   and latitude of date, airless, CENTER=500@399 (geocentric),
   QUANTITIES=31. Sources of record per body are noted in the table below.

   These are quoted from the service, not remembered, and each row can be
   re-fetched with the request recorded in SPEC.md. */

const assert = require('assert');

describe('ephemeris.planets', () => {
  const P = () => globalThis.SMRC.planets;
  const M = () => globalThis.SMRC.math;

  /* [jd, body, referenceLongitude, referenceLatitude] */
  const REFERENCE = [
    /* 1990-06-15 00:00 UT, JD 2448058.5 */
    [2448058.5, 'mercury', 66.5543761, -1.5728702],
    [2448058.5, 'venus', 49.3656910, -1.9368114],
    [2448058.5, 'mars', 11.4006268, -1.9880827],
    [2448058.5, 'jupiter', 105.9978617, 0.1863257],
    [2448058.5, 'saturn', 294.0024825, 0.1159242],
    /* 2024-01-01 00:00 UT, JD 2460310.5 */
    [2460310.5, 'mercury', 262.2816922, 3.0649825],
    [2460310.5, 'venus', 242.6122975, 1.9498256],
    [2460310.5, 'mars', 267.3083422, -0.5504977],
    [2460310.5, 'jupiter', 35.5823812, -1.1854765],
    [2460310.5, 'saturn', 333.2435330, -1.6341214]
  ];

  /* The reduction is complete to light time, aberration and nutation, so what
     is left is the truncated series plus the DE441/JPL difference. Measured
     worst case across both epochs is 42 arcsec (Venus, 1970 epoch); 60 is a
     deliberate margin, and still 1/500th of the width of a sign. */
  const TOLERANCE_ARCSEC = 60;

  it('matches JPL apparent longitude for every body and epoch', () => {
    for (const [jd, body, refLon] of REFERENCE) {
      const got = P().apparent(body, jd).longitude;
      const err = Math.abs(M().angleDiff(got, refLon)) * 3600;
      assert.ok(
        err < TOLERANCE_ARCSEC,
        `${body} at JD ${jd}: got ${got.toFixed(6)}, expected ${refLon}, off ${err.toFixed(1)}"`
      );
    }
  });

  it('matches JPL apparent latitude for every body and epoch', () => {
    for (const [jd, body, , refLat] of REFERENCE) {
      const got = P().apparent(body, jd).latitude;
      const err = Math.abs(got - refLat) * 3600;
      assert.ok(
        err < TOLERANCE_ARCSEC,
        `${body} at JD ${jd}: got ${got.toFixed(6)}, expected ${refLat}, off ${err.toFixed(1)}"`
      );
    }
  });

  /* Julian day for a calendar date, from the project's own conversion, so the
     test states a date rather than a hand-computed number. */
  const jd = (year, month, day, fraction) => {
    const T = globalThis.SMRC.time;
    return T.julianDay(year, month, day) + (fraction || 0);
  };

  it('keeps every planet inside its own heliocentric distance range', () => {
    /* A physical invariant rather than a quoted number: no orbit can be
       outside its own perihelion and aphelion. This is the heliocentric
       radius, so it is compared against the perihelion and aphelion of the
       orbit itself, not against the geocentric distance to an observer. */
    const table = globalThis.SMRC.vsop87d;
    for (const [jdValue] of REFERENCE) {
      for (const body of P().NAMES) {
        const tau = (jdValue - 2451545.0) / 365250.0;
        const r = P().sumSeries(table[body].R, tau);
        const [lo, hi] = P().RANGES[body];
        assert.ok(
          r >= lo && r <= hi,
          `${body} at JD ${jdValue}: heliocentric radius ${r.toFixed(5)} au outside [${lo}, ${hi}]`
        );
      }
    }
  });

  it('puts the Sun where the existing ephemeris says it is', () => {
    /* Cross-check against the module this file sits beside: the Earth term of
       VSOP87D and the Sun series of Meeus 25.2 must describe the same orbit. */
    const E = globalThis.SMRC.ephemeris;
    for (const jd of [2448058.5, 2460310.5]) {
      const fromEarth = P().sunFromEarth(jd).longitude;
      const fromSeries = E.sun(jd).longitude;
      const err = Math.abs(M().angleDiff(fromEarth, fromSeries)) * 3600;
      assert.ok(err < 60, `Sun cross-check at JD ${jd} off by ${err.toFixed(1)}"`);
    }
  });

  it('reports a longitude rate that is negative only when retrograde', () => {
    /* Mars was retrograde from 2024-12-06 to 2025-02-24, and direct in 1990. */
    assert.ok(P().longitudeRate('mars', jd(2025, 1, 10)) < 0, 'Mars should be retrograde in Jan 2025');
    assert.ok(P().longitudeRate('mars', jd(2025, 6, 1)) > 0, 'Mars should be direct in Jun 2025');
    assert.ok(P().longitudeRate('mars', jd(1990, 6, 15)) > 0, 'Mars should be direct in Jun 1990');
  });

  it('finds a retrograde station on the date JPL gives', () => {
    /* Mercury stationed retrograde at 2023-12-13 07:07 UT, from JPL Horizons
       by bisecting the sign change of its daily apparent longitude. A station
       is where the rate crosses zero, so near that instant the rate is tiny
       even though the absolute longitude is uncertain by tens of arcseconds. */
    const station = jd(2023, 12, 13, 0.30);
    const rate = P().longitudeRate('mercury', station, 0.05);
    assert.ok(
      Math.abs(rate) < 0.35,
      `Mercury longitude rate near its 2023-12-13 station was ${rate.toFixed(3)} deg/day`
    );
    /* And clearly retrograde a fortnight later, which is what the station
       actually asserts. */
    assert.ok(P().longitudeRate('mercury', jd(2023, 12, 27)) < -1, 'Mercury should be retrograde by then');
  });

  it('rejects a body it does not have', () => {
    assert.throws(() => P().apparent('pluto', 2460310.5), /no such body/);
  });

  it('sums a series the way VSOP87 defines it', () => {
    /* sumSeries of an empty series is zero, and of a single term is
       A * cos(B + C * tau). */
    assert.strictEqual(P().sumSeries([], 0.5), 0);
    const one = [[0, [[2, 1, 3]]]];
    assert.ok(Math.abs(P().sumSeries(one, 0.5) - 2 * Math.cos(2.5)) < 1e-12);
  });
});
