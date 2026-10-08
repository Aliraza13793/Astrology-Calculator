/* Turns a birth record into a chart. Synchronous, no DOM, no I/O. */
(function (root) {
  'use strict';

  var M = root.SMRC.math;
  var T = root.SMRC.time;
  var E = root.SMRC.ephemeris;
  var H = root.SMRC.houses;
  var Z = root.SMRC.zodiac;

  /* A minute of birth time moves the Ascendant by around a quarter of a degree
     in ecliptic longitude, which is what the accuracy notes are built on. The
     rate depends on latitude and on the Ascendant's own position, so these are
     typical values rather than constants of the geometry. The Moon moves
     0.00915 degrees a minute, which is why its sign survives a birth time
     that is wrong by up to nearly two hours. */
  var ASC_PER_MINUTE = 0.2506;
  var MOON_PER_MINUTE = 0.00915;

  /* Display names for the optional bodies, so a chart never shows a raw key. */
  var PLANET_NAMES = {
    mercury: 'Mercury',
    venus: 'Venus',
    mars: 'Mars',
    jupiter: 'Jupiter',
    saturn: 'Saturn'
  };

  /**
   * How far a longitude sits from the sign boundary behind it. Below a third
   * of a degree the reported sign should be read as provisional.
   * @param {number} lam degrees
   * @returns {number} degrees
   */
  function cuspMargin(lam) {
    return Z.nearestBoundary(lam).degreesToBoundary;
  }

  function body(lam, cusps, label, bodyKey) {
    var at = Z.fromLongitude(lam);
    var place = cusps ? H.placement(lam, cusps) : null;
    var result = {
      label: label,
      bodyKey: bodyKey || null,
      longitude: lam,
      longitudeText: Z.formatLongitude(lam),
      signIndex: at.index,
      sign: at.sign,
      degree: at.degree,
      degreeText: Z.formatDegree(at.degree),
      cuspMargin: cuspMargin(lam),
      house: place ? place.house : null,
      decanate: place ? place.decanate : null,
      retrograde: false
    };
    return result;
  }

  /**
   * Full Big Three chart.
   *
   * @param {{year: number, month: number, day: number, hour: number,
   *   minute: number, timeUnknown?: boolean, latitude: number,
   *   longitude: number, timezone: string, placeName?: string}} birth
   * @param {{planets?: string[]}} [options] extra bodies to place, by key in
   *   SMRC.planets ('venus', 'mars', and so on). Omitted by default so the
   *   Big Three costs nothing extra; the compatibility tool asks for the ones
   *   it needs rather than carrying a second copy of this function.
   * @returns {object} chart
   */
  function compute(birth, options) {
    var config = root.SMRC.config;
    var zone = T.zonedTimeToUtc(
      birth.timezone,
      birth.year,
      birth.month,
      birth.day,
      birth.hour,
      birth.minute
    );
    var jd = T.julianDayFromUnixMs(zone.unixMs);
    var t = T.centuriesJ2000(jd);

    var nut = E.nutationAndObliquity(jd);
    var sunPos = E.sun(jd);
    var moonPos = E.moon(jd);

    var gast = T.greenwichApparentSiderealTime(jd, nut.nutationLon, nut.obliquity);
    var last = T.localApparentSiderealTime(gast, birth.longitude);

    var ang = H.angles(last, birth.latitude, nut.obliquity);
    var houses = H.wholeSign(ang.ascendant);

    var phase = E.moonPhase(sunPos.longitude, moonPos.longitude, sunPos.distance, moonPos.distance);

    var bigThree = {
      sun: body(sunPos.longitude, houses.cusps, 'Sun', 'sun'),
      moon: body(moonPos.longitude, houses.cusps, 'Moon', 'moon'),
      rising: body(ang.ascendant, houses.cusps, 'Rising', 'rising')
    };
    var mc = body(ang.mc, houses.cusps, 'MC', 'mc');

    var extra = {};
    var wanted = (options && options.planets) || [];
    for (var i = 0; i < wanted.length; i++) {
      var key = wanted[i];
      var pos = root.SMRC.planets.apparent(key, jd);
      var placed = body(pos.longitude, houses.cusps, PLANET_NAMES[key] || key);
      placed.bodyKey = key;
      /* Retrograde is a property of the motion, not of the place, so it is
         read off the longitude rate rather than inferred from the sign. */
      placed.retrograde = root.SMRC.planets.longitudeRate(key, jd) < 0;
      placed.distance = pos.distance;
      extra[key] = placed;
    }

    var timeUnknown = !!birth.timeUnknown;
    var noon = timeUnknown
      ? solarNoon(birth.timezone, birth.latitude, birth.longitude, birth.year, birth.month, birth.day)
      : null;

    return {
      input: birth,
      solarNoon: noon,
      moment: {
        unixMs: zone.unixMs,
        jd: jd,
        centuries: t,
        timezone: birth.timezone,
        utcOffsetMinutes: zone.offsetMinutes,
        utcOffsetLabel: zone.offsetLabel,
        localTimeLabel: pad(birth.hour) + ':' + pad(birth.minute),
        utcLabel: new Date(zone.unixMs).toISOString(),
        ambiguousLocalTime: zone.ambiguous,
        nonexistentLocalTime: zone.nonexistent,
        timeUnknown: timeUnknown
      },
      obliquity: nut.obliquity,
      nutation: nut,
      sidereal: { gast: gast, last: last },
      sun: {
        longitude: sunPos.longitude,
        distance: sunPos.distance,
        trueLongitude: sunPos.trueLongitude
      },
      planets: extra,
      moon: {
        longitude: moonPos.longitude,
        distance: moonPos.distance,
        phase: phase.phase,
        illumination: phase.illumination,
        age: phase.age,
        phaseName: E.moonPhaseName(phase.phase)
      },
      angles: {
        ascendant: ang.ascendant,
        mc: ang.mc,
        descendant: ang.descendant,
        imumCoeli: ang.imumCoeli
      },
      houses: houses,
      bodies: bigThree,
      mc: mc,
      uncertainty: {
        timeUnknown: timeUnknown,
        risingMarginDeg: timeUnknown ? null : cuspMargin(ang.ascendant),
        moonMarginDeg: timeUnknown ? null : cuspMargin(moonPos.longitude),
        ascendantPerMinute: ASC_PER_MINUTE,
        moonPerMinute: MOON_PER_MINUTE,
        /* Minutes of birth time that would have to be wrong to change a sign. */
        risingMinutesPerDegree: 1 / ASC_PER_MINUTE,
        moonMinutesPerDegree: 1 / MOON_PER_MINUTE
      },
      limits: config.accuracy
    };
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  /**
   * The instant the Sun crosses the local meridian, which is the best available
   * stand-in for an unknown birth time: it is the one moment of the day when the
   * Sun's position is least sensitive to the clock.
   *
   * Solved rather than approximated, because local clock noon can be more than
   * a quarter of an hour away from the truth once the equation of time and the
   * longitude inside the timezone are taken into account.
   *
   * @param {string} timezone IANA zone name
   * @param {number} latitude degrees, north positive
   * @param {number} longitude degrees, east positive
   * @param {number} year
   * @param {number} month 1-12
   * @param {number} day 1-31
   * @returns {{unixMs: number, localLabel: string, offsetLabel: string,
   *            minutesFromClockNoon: number}}
   */
  function solarNoon(timezone, latitude, longitude, year, month, day) {
    /* The Sun is on the upper meridian when the local sidereal time leads its
       right ascension by zero hours. The same condition is also met, modulo
       the twelve hour wrap, at the lower transit near local midnight, so the
       search is confined to the eight hours around clock noon, which is wider
       than any timezone offset error plus the equation of time. */
    function hourAngle(unixMs) {
      var jd = T.julianDayFromUnixMs(unixMs);
      var nut = E.nutationAndObliquity(jd);
      var sunPos = E.sun(jd);
      var gast = T.greenwichApparentSiderealTime(jd, nut.nutationLon, nut.obliquity);
      var last = T.localApparentSiderealTime(gast, longitude);
      var ra = H.equatorial(sunPos.longitude, nut.obliquity).ra;
      return M.angleDiff(ra, last);
    }

    var windowStart = T.zonedTimeToUtc(timezone, year, month, day, 8, 0).unixMs;
    var windowEnd = T.zonedTimeToUtc(timezone, year, month, day, 16, 0).unixMs;
    var stepMs = 4 * 60 * 1000;
    var previousMs = windowStart;
    var previousGap = hourAngle(previousMs);
    var found = null;

    for (var i = 1; i * stepMs <= windowEnd - windowStart; i++) {
      var nowMs = windowStart + i * stepMs;
      var nowGap = hourAngle(nowMs);
      if ((previousGap < 0 && nowGap > 0) || (previousGap > 0 && nowGap < 0)) {
        var lo = previousMs;
        var hi = nowMs;
        for (var k = 0; k < 40; k++) {
          var mid = (lo + hi) / 2;
          if ((hourAngle(lo) < 0) === (hourAngle(mid) < 0)) lo = mid;
          else hi = mid;
        }
        found = (lo + hi) / 2;
        break;
      }
      previousMs = nowMs;
      previousGap = nowGap;
    }

    var clockNoon = T.zonedTimeToUtc(timezone, year, month, day, 12, 0);
    var instant = found === null ? clockNoon.unixMs : found;
    var local = new Date(instant + clockNoon.offsetMinutes * 60000);
    return {
      unixMs: instant,
      localLabel: pad(local.getUTCHours()) + ':' + pad(local.getUTCMinutes()),
      offsetLabel: clockNoon.offsetLabel,
      minutesFromClockNoon: Math.round((instant - clockNoon.unixMs) / 60000)
    };
  }

  root.SMRC.chart = {
    compute: compute,
    solarNoon: solarNoon,
    ASC_PER_MINUTE: ASC_PER_MINUTE,
    MOON_PER_MINUTE: MOON_PER_MINUTE
  };
})(typeof window !== 'undefined' ? window : globalThis);
