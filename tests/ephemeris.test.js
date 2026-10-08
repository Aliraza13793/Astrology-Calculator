'use strict';

const assert = require('assert');
const E = globalThis.SMRC.ephemeris;
const T = globalThis.SMRC.time;
const M = globalThis.SMRC.math;

const ARCSEC = 1 / 3600;

function degrees(hours) {
  return hours * 15;
}

function arcmin(hours) {
  return hours * 15 / 60;
}

function jdAt(iso) {
  return T.julianDayFromUnixMs(Date.parse(iso));
}

describe('ephemeris.sun', () => {
  it('is at 0 degrees of Aries at the March equinox', () => {
    /* Equinoxes and solstices are the one place the Sun's apparent longitude
       is known independently of any ephemeris. The March equinox of 2020 was
       20 March 03:50 UT. */
    const sun = E.sun(jdAt('2020-03-20T03:50:00Z'));
    assert.ok(
      Math.abs(M.angleDiff(sun.longitude, 0)) < 0.02,
      'longitude ' + sun.longitude
    );
  });

  it('is at 90, 180 and 270 degrees at the solstices and equinoxes', () => {
    const cases = [
      ['2020-06-20T21:44:00Z', 90],
      ['2020-09-22T13:31:00Z', 180],
      ['2020-12-21T10:02:00Z', 270]
    ];
    for (const c of cases) {
      const sun = E.sun(jdAt(c[0]));
      assert.ok(
        Math.abs(M.angleDiff(sun.longitude, c[1])) < 0.02,
        c[0] + ' longitude ' + sun.longitude + ' expected ' + c[1]
      );
    }
  });

  it('crosses the zero of Aries once a year', () => {
    const start = Date.parse('2020-01-01T00:00:00Z');
    let previous = E.sun(jdAt('2020-01-01T00:00:00Z')).longitude;
    let crossings = 0;
    for (let i = 1; i <= 366; i++) {
      const now = E.sun(T.julianDayFromUnixMs(start + i * 86400000)).longitude;
      /* A rising sign test: a decrease through 360 means Aries 0 was passed. */
      if (now < previous) crossings++;
      previous = now;
    }
    assert.strictEqual(crossings, 1);
  });

  it('reaches perihelion in early January', () => {
    /* Rather than trusting a remembered clock time, the distance is scanned
       and the minimum located. The perihelion distance is 0.98329 AU and by
       definition the mean anomaly is zero there. */
    const start = Date.parse('2020-12-28T00:00:00Z');
    let best = null;
    for (let h = 0; h < 24 * 14; h++) {
      const jd = T.julianDayFromUnixMs(start + h * 3600000);
      const s = E.sun(jd);
      if (!best || s.distance < best.distance) best = s;
    }
    assert.ok(
      Math.abs(best.distance / 149597870.7 - 0.9833) < 5e-5,
      'perihelion distance ' + best.distance / 149597870.7
    );
    assert.ok(
      Math.min(best.meanAnomaly, 360 - best.meanAnomaly) < 0.05,
      'mean anomaly at perihelion ' + best.meanAnomaly
    );
    /* The Sun's mean longitude at perihelion was 282.94 degrees at J2000 and
       precesses by about 0.014 degrees a year. */
    const expected = 282.94 + 0.01397 * 21;
    assert.ok(
      Math.abs(M.angleDiff(best.meanLongitude, expected)) < 0.1,
      'mean longitude at perihelion ' + best.meanLongitude + ' vs ' + expected
    );
  });

  it('keeps the distance between the perihelion and aphelion extremes', () => {
    /* Perihelion early January, aphelion early July. */
    const perihelion = E.sun(T.julianDay(2021, 1, 4));
    const aphelion = E.sun(T.julianDay(2021, 7, 4));
    assert.ok(perihelion.distance < 147.2e6, 'perihelion ' + perihelion.distance);
    assert.ok(aphelion.distance > 152.0e6, 'aphelion ' + aphelion.distance);
    assert.ok(aphelion.distance > 152.09e6, 'aphelion ' + aphelion.distance);
  });

  it('matches Meeus 25.a to the accuracy the formula claims', () => {
    /* Meeus example 25.a, 1992 October 13.0 TD. The book prints the apparent
       longitude as 199 54' 21.8" from the full VSOP series; the 25.2 series
       used here is specified to 0.01 degrees, which is 36 arcseconds. */
    const sun = E.sun(T.julianDay(1992, 10, 13));
    const expected = 199 + (54 + 21.8 / 60) / 60;
    assert.ok(
      Math.abs(M.angleDiff(sun.longitude, expected)) < 36 * ARCSEC,
      'apparent longitude ' + sun.longitude + ' vs ' + expected
    );
    assert.ok(
      Math.abs(sun.distance / 149597870.7 - 0.99760775) < 1e-4,
      'radius vector ' + sun.distance / 149597870.7
    );
  });
});

describe('ephemeris.moon', () => {
  it('matches Meeus 47.a: the Moon on 1992 April 12.0', () => {
    /* Meeus example 47.a: the Moon's apparent longitude comes out at
       133 10' 02.1" with a distance of 368409.7 km. */
    const jd = T.julianDay(1992, 4, 12);
    const moon = E.moon(jd);
    const expected = 133 + (10 + 2.1 / 60) / 60;
    assert.ok(
      Math.abs(M.angleDiff(moon.longitude, expected)) < 30 * ARCSEC,
      'longitude ' + moon.longitude + ' vs ' + expected
    );
    assert.ok(
      Math.abs(moon.distance - 368409.7) < 50,
      'distance ' + moon.distance
    );
  });

  it('advances by roughly 13.2 degrees a day', () => {
    const a = E.moon(T.julianDay(2024, 5, 1));
    const b = E.moon(T.julianDay(2024, 5, 2));
    const advance = M.norm360(b.longitude - a.longitude);
    assert.ok(advance > 12 && advance < 15, 'advance ' + advance);
  });

  it('keeps the distance inside the real perigee and apogee range', () => {
    const moon = E.moon(T.julianDay(2024, 5, 1));
    assert.ok(moon.distance > 356000 && moon.distance < 407000, 'distance ' + moon.distance);
  });

  it('sits within one degree of the Sun at new moon', () => {
    /* New moon of 2024 May 8, 03:22 UT. */
    const jd = T.julianDayFromUnixMs(Date.UTC(2024, 4, 8, 3, 22, 0));
    const sun = E.sun(jd);
    const moon = E.moon(jd);
    const separation = Math.abs(M.angleDiff(sun.longitude, moon.longitude));
    assert.ok(separation < 1, 'separation ' + separation);
  });

  it('sits within one degree of the Sun at full moon', () => {
    /* Full moon of 2024 May 23, 13:53 UT. */
    const jd = T.julianDayFromUnixMs(Date.UTC(2024, 4, 23, 13, 53, 0));
    const sun = E.sun(jd);
    const moon = E.moon(jd);
    const separation = Math.abs(M.angleDiff(sun.longitude, moon.longitude));
    assert.ok(Math.abs(separation - 180) < 1, 'separation ' + separation);
  });
});

describe('ephemeris.phase', () => {
  it('names the phases and the illumination follows them', () => {
    assert.strictEqual(E.moonPhaseName(0.0), 'New Moon');
    assert.strictEqual(E.moonPhaseName(0.5), 'Full Moon');
    assert.strictEqual(E.moonPhaseName(0.25), 'First Quarter');
    assert.strictEqual(E.moonPhaseName(0.75), 'Last Quarter');

    const jd = T.julianDay(2024, 5, 1);
    const sun = E.sun(jd);
    const moon = E.moon(jd);
    const phase = E.moonPhase(sun.longitude, moon.longitude, sun.distance, moon.distance);
    assert.ok(phase.illumination > 0 && phase.illumination <= 1);
  });
});

describe('ephemeris.nutation', () => {
  it('gives the standard J2000 mean obliquity', () => {
    /* The mean obliquity at J2000.0 is 23 26' 21.448". */
    const n = E.nutationAndObliquity(2451545.0);
    const expected = 23 + 26 / 60 + 21.448 / 3600;
    assert.ok(
      Math.abs(n.meanObliquity - expected) < 1e-9,
      'mean obliquity ' + n.meanObliquity + ' vs ' + expected
    );
    assert.ok(Math.abs(n.nutationLon) < 0.01, 'nutation ' + n.nutationLon);
  });

  it('matches Meeus 22.a: obliquity on 1987 April 10.0', () => {
    /* Meeus example 22.a gives the mean obliquity as 23 26' 27.407". */
    const n = E.nutationAndObliquity(2446895.5);
    const expected = 23 + 26 / 60 + 27.407 / 3600;
    assert.ok(
      Math.abs(n.meanObliquity - expected) < 0.0005,
      'mean obliquity ' + n.meanObliquity + ' vs ' + expected
    );
  });

  it('keeps the true obliquity within ten arcseconds of the mean', () => {
    const n = E.nutationAndObliquity(2451545.0);
    assert.ok(
      Math.abs(n.obliquity - n.meanObliquity) < 10 * ARCSEC,
      'difference ' + (n.obliquity - n.meanObliquity)
    );
  });
});

void arcmin;
