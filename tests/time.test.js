'use strict';

const assert = require('assert');
const T = globalThis.SMRC.time;
const M = globalThis.SMRC.math;

describe('time.julianDay', () => {
  it('matches Meeus 7.a: 1957 October 4.81', () => {
    /* Meeus, Astronomical Algorithms 2nd ed., example 7.a gives
       JD 2436116.31 for 1957 October 4.81, so 0h of that day is 2436115.5. */
    assert.strictEqual(T.julianDay(1957, 10, 4), 2436115.5);
    assert.strictEqual(T.julianDay(1957, 10, 4) + 0.81, 2436116.31);
  });

  it('puts J2000.0 at 2000 January 1.5', () => {
    assert.strictEqual(T.julianDay(2000, 1, 1), 2451544.5);
    assert.strictEqual(T.julianDayFromUnixMs(Date.UTC(2000, 0, 1, 12, 0, 0)), 2451545.0);
    assert.strictEqual(T.centuriesJ2000(2451545.0), 0);
  });

  it('switches calendar in October 1582', () => {
    /* Meeus 7.1: 1582 October 4 (Julian) and October 15 (Gregorian) are
       consecutive days. */
    assert.strictEqual(T.julianDay(1582, 10, 4), 2299159.5);
    assert.strictEqual(T.julianDay(1582, 10, 15), 2299160.5);
  });

  it('handles the century leap rule', () => {
    /* 1900 was not a leap year in the Gregorian calendar, 2000 was. */
    assert.strictEqual(T.julianDay(1900, 1, 31), 2415050.5);
    assert.strictEqual(T.julianDay(2000, 2, 29), 2451603.5);
    assert.strictEqual(T.julianDay(2000, 3, 1) - T.julianDay(2000, 2, 29), 1);
    assert.strictEqual(T.julianDay(1900, 3, 1) - T.julianDay(1900, 2, 28), 1);
  });
});

describe('time.sidereal', () => {
  it('matches Meeus 12.a: GMST on 1987 April 10.0', () => {
    /* Meeus example 12.a: theta0 = 13h10m46.3668s on 1987 April 10.0 TD. */
    const theta = T.greenwichMeanSiderealTime(2446895.5);
    const hours = theta / 15;
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = ((hours - h) * 60 - m) * 60;
    assert.ok(Math.abs(h - 13) === 0, 'hour ' + h);
    assert.ok(Math.abs(m - 10) === 0, 'minute ' + m);
    assert.ok(Math.abs(s - 46.3668) < 0.01, 'second ' + s);
  });

  it('advances by 15.0410686 degrees per day', () => {
    const a = T.greenwichMeanSiderealTime(2451545.0);
    const b = T.greenwichMeanSiderealTime(2451546.0);
    const delta = M.norm360(b - a);
    assert.ok(Math.abs(delta - 0.98564736629) < 1e-8, 'delta ' + delta);
    /* A full extra turn each day, so the same sidereal time is reached
       roughly 3m56s earlier the next day. */
    assert.ok(Math.abs((delta + 360) - 360.98564736629) < 1e-8);
  });

  it('adds the equation of the equinoxes for apparent time', () => {
    const gast = T.greenwichApparentSiderealTime(2451545.0, 0.004, 23.4393);
    const gmst = T.greenwichMeanSiderealTime(2451545.0);
    const expected = M.norm360(gmst + 0.004 * Math.cos(23.4393 * Math.PI / 180));
    assert.ok(Math.abs(M.norm360(gast - expected)) < 1e-9);
  });

  it('shifts local sidereal time by longitude', () => {
    assert.strictEqual(T.localApparentSiderealTime(100, 20), 120);
    assert.strictEqual(T.localApparentSiderealTime(10, -30), 340);
  });
});

describe('time.timezone', () => {
  it('resolves the offset for the historical date, not today', () => {
    const winter = T.zonedTimeToUtc('America/New_York', 1975, 1, 15, 12, 0);
    assert.strictEqual(winter.offsetMinutes, -300);
    assert.strictEqual(winter.offsetLabel, '-05:00');
    assert.strictEqual(winter.unixMs, Date.UTC(1975, 0, 15, 17, 0, 0));

    const summer = T.zonedTimeToUtc('America/New_York', 1975, 7, 15, 12, 0);
    assert.strictEqual(summer.offsetMinutes, -240);
    assert.strictEqual(summer.unixMs, Date.UTC(1975, 6, 15, 16, 0, 0));
  });

  it('handles zones with a positive offset and a half hour offset', () => {
    const india = T.zonedTimeToUtc('Asia/Kolkata', 1990, 1, 1, 0, 0);
    assert.strictEqual(india.offsetMinutes, 330);
    assert.strictEqual(india.offsetLabel, '+05:30');
    assert.strictEqual(india.unixMs, Date.UTC(1989, 11, 31, 18, 30, 0));

    const nepal = T.zonedTimeToUtc('Asia/Kathmandu', 1990, 1, 1, 0, 0);
    assert.strictEqual(nepal.offsetMinutes, 345);
  });

  it('applies the summer time rules that were in force on the date', () => {
    /* Portugal has kept summer time since 1983, so June 1990 is UTC+1. */
    const ninety = T.zonedTimeToUtc('Europe/Lisbon', 1990, 6, 1, 12, 0);
    assert.strictEqual(ninety.offsetMinutes, 60);
    assert.strictEqual(T.zonedTimeToUtc('Europe/Lisbon', 1990, 1, 1, 12, 0).offsetMinutes, 0);
  });

  it('follows a country that abolished its daylight saving', () => {
    /* Russia moved to permanent summer time in March 2011 and dropped it in
       October 2014, so Moscow was UTC+3 in January 2010, UTC+4 in January
       2013 and UTC+3 again in 2016. */
    assert.strictEqual(T.zonedTimeToUtc('Europe/Moscow', 2010, 1, 15, 12, 0).offsetMinutes, 180);
    assert.strictEqual(T.zonedTimeToUtc('Europe/Moscow', 2013, 1, 15, 12, 0).offsetMinutes, 240);
    assert.strictEqual(T.zonedTimeToUtc('Europe/Moscow', 2016, 1, 15, 12, 0).offsetMinutes, 180);
  });

  it('knows pre-standard-time offsets are not today offset', () => {
    const old = T.zonedTimeToUtc('America/New_York', 1880, 6, 1, 12, 0);
    assert.ok(old.offsetMinutes < -240, 'offset ' + old.offsetMinutes);
    assert.ok(old.offsetMinutes > -300, 'offset ' + old.offsetMinutes);
  });

  it('flags the repeated hour when the clocks go back', () => {
    const ambiguous = T.zonedTimeToUtc('America/New_York', 2024, 11, 3, 1, 30);
    assert.strictEqual(ambiguous.ambiguous, true);
  });

  it('flags the skipped hour when the clocks go forward', () => {
    const missing = T.zonedTimeToUtc('America/New_York', 2024, 3, 10, 2, 30);
    assert.strictEqual(missing.nonexistent, true);
  });

  it('rejects an unknown zone', () => {
    assert.strictEqual(T.isValidTimeZone('Europe/Lisbon'), true);
    assert.strictEqual(T.isValidTimeZone('Mars/Olympus'), false);
    assert.strictEqual(T.isValidTimeZone(''), false);
    assert.strictEqual(T.isValidTimeZone(null), false);
  });

  it('formats offsets', () => {
    assert.strictEqual(T.formatOffset(0), '+00:00');
    assert.strictEqual(T.formatOffset(-330), '-05:30');
    assert.strictEqual(T.formatOffset(345), '+05:45');
  });
});
