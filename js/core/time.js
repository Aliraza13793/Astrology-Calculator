/* Julian day, IANA timezone resolution, and sidereal time.
   References: Meeus ch. 7 (Julian day), ch. 10 (sidereal time), ch. 12 (apparent). */
(function (root) {
  'use strict';

  var M = root.SMRC.math;

  var UNIX_EPOCH_JD = 2440587.5;
  var J2000 = 2451545.0;
  var SECONDS_PER_DAY = 86400;

  /**
   * Julian Day from a proleptic calendar date, at 00:00 UT.
   * Gregorian before 1582-10-15, Julian after (Meeus 7.1).
   * @param {number} year
   * @param {number} month 1-12
   * @param {number} day 1-31
   * @param {boolean} [gregorian] force calendar, else auto-switch
   * @returns {number} JD, e.g. 2451544.5 for 2000-01-01 00:00 UT
   */
  function julianDay(year, month, day, gregorian) {
    var y = year;
    var m = month;
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    var gregorianInUse = typeof gregorian === 'boolean'
      ? gregorian
      : (year > 1582
        || (year === 1582 && (month > 10 || (month === 10 && day >= 15))));

    var b = 0;
    if (gregorianInUse) {
      var a = Math.floor(y / 100);
      b = 2 - a + Math.floor(a / 4);
    }
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1))
      + day + b - 1524.5;
  }

  /**
   * Julian Day from a UTC timestamp, fractional day included.
   * @param {number} unixMs milliseconds since 1970-01-01T00:00:00Z
   * @returns {number} JD
   */
  function julianDayFromUnixMs(unixMs) {
    return unixMs / 86400000 + UNIX_EPOCH_JD;
  }

  /**
   * Julian centuries from J2000.0. TT and UT are treated as equal here, which
   * costs at most 0.7 s of lunar longitude; the difference is far below the
   * truncation error of the series used (Meeus 10.7 note).
   * @param {number} jd
   * @returns {number} T
   */
  function centuriesJ2000(jd) {
    return (jd - J2000) / 36525;
  }

  var offsetFormatters = {};

  function getFormatter(tz) {
    if (!offsetFormatters[tz]) {
      offsetFormatters[tz] = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
    return offsetFormatters[tz];
  }

  /**
   * True when the runtime's Intl implementation recognises an IANA zone.
   * @param {string} tz
   * @returns {boolean}
   */
  function isValidTimeZone(tz) {
    if (!tz || typeof tz !== 'string') return false;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz });
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * UTC offset actually in force in `tz` at the given instant, historical
   * daylight saving included, straight from the platform's IANA database.
   * @param {string} tz IANA zone name, e.g. 'Europe/Lisbon'
   * @param {number} unixMs
   * @returns {number} offset in minutes, east of UTC positive
   */
  function offsetMinutesAt(tz, unixMs) {
    var parts = getFormatter(tz).formatToParts(new Date(unixMs));
    var got = {};
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.type !== 'literal') got[p.type] = parseInt(p.value, 10);
    }
    var asUtc = Date.UTC(
      got.year,
      got.month - 1,
      got.day,
      got.hour,
      got.minute,
      got.second
    );
    return Math.round((asUtc - unixMs) / 60000);
  }

  /**
   * Convert a local wall-clock time in a named zone to a UTC instant.
   * The offset is looked up for that historical instant, not for today, so a
   * 1975 birth in the US resolves to EST (-5) and a July one to EDT (-4).
   *
   * Around a daylight-saving transition the same wall clock can be missing or
   * can happen twice. Both cases are found by testing the offsets a day either
   * side and seeing which candidate instants are self consistent.
   *
   * @param {string} tz IANA zone name
   * @param {number} year
   * @param {number} month 1-12
   * @param {number} day 1-31
   * @param {number} hour 0-23
   * @param {number} minute 0-59
   * @returns {{unixMs: number, offsetMinutes: number, offsetLabel: string,
   *            ambiguous: boolean, nonexistent: boolean}}
   */
  function zonedTimeToUtc(tz, year, month, day, hour, minute) {
    var naive = Date.UTC(year, month - 1, day, hour, minute, 0);
    var offBefore = offsetMinutesAt(tz, naive - 86400000);
    var offAfter = offsetMinutesAt(tz, naive + 86400000);

    var candidateA = naive - offBefore * 60000;
    var candidateB = naive - offAfter * 60000;
    var validA = offsetMinutesAt(tz, candidateA) === offBefore;
    var validB = offsetMinutesAt(tz, candidateB) === offAfter;

    var result = {
      unixMs: candidateA,
      offsetMinutes: offBefore,
      offsetLabel: formatOffset(offBefore),
      ambiguous: false,
      nonexistent: false
    };

    if (validA && validB) {
      /* The wall clock reads twice. The earlier instant is the one still on
         the old offset, which is the conventional reading of a repeated hour. */
      result.ambiguous = offBefore !== offAfter;
      if (candidateB < candidateA) {
        result.unixMs = candidateB;
        result.offsetMinutes = offAfter;
      }
    } else if (validA) {
      result.unixMs = candidateA;
      result.offsetMinutes = offBefore;
    } else if (validB) {
      result.unixMs = candidateB;
      result.offsetMinutes = offAfter;
    } else {
      /* The wall clock never happens. Report the instant the clocks jumped,
         the earliest real moment that could have been meant. */
      result.nonexistent = true;
      if (candidateB > candidateA) {
        result.unixMs = candidateB;
        result.offsetMinutes = offAfter;
      } else {
        result.unixMs = candidateA;
        result.offsetMinutes = offBefore;
      }
    }

    result.offsetLabel = formatOffset(result.offsetMinutes);
    return result;
  }

  /**
   * Format a UTC offset in minutes as '+01:00' / '-05:00'.
   * @param {number} minutes
   * @returns {string}
   */
  function formatOffset(minutes) {
    var sign = minutes < 0 ? '-' : '+';
    var abs = Math.abs(minutes);
    var h = Math.floor(abs / 60);
    var m = abs % 60;
    return sign + (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  /**
   * Greenwich mean sidereal time in degrees, from the JD at 0h UT plus the
   * elapsed fraction of the day (Meeus 12.4).
   * @param {number} jd
   * @param {number} [dT] delta-T seconds; 0 by default
   * @returns {number} GMST in degrees, [0, 360)
   */
  function greenwichMeanSiderealTime(jd) {
    var t = centuriesJ2000(jd);
    var theta = 280.46061837
      + 360.98564736629 * (jd - J2000)
      + 0.000387933 * t * t
      - (t * t * t) / 38710000;
    return M.norm360(theta);
  }

  /**
   * Greenwich apparent sidereal time in degrees: GMST plus the equation of the
   * equinoxes (Meeus 12.10).
   * @param {number} jd
   * @param {number} nutationLonDeg nutation in longitude, degrees
   * @param {number} trueObliquityDeg
   * @returns {number} GAST in degrees, [0, 360)
   */
  function greenwichApparentSiderealTime(jd, nutationLonDeg, trueObliquityDeg) {
    var equationOfEquinoxes = nutationLonDeg * M.cosDeg(trueObliquityDeg);
    return M.norm360(greenwichMeanSiderealTime(jd) + equationOfEquinoxes);
  }

  /**
   * Local apparent sidereal time in degrees, the rotation angle that drives
   * the Ascendant.
   * @param {number} gast Greenwich apparent sidereal time, degrees
   * @param {number} longitudeDeg east positive
   * @returns {number} LAST in degrees, [0, 360)
   */
  function localApparentSiderealTime(gast, longitudeDeg) {
    return M.norm360(gast + longitudeDeg);
  }

  /**
   * Elapsed fraction of a UTC day, for the sidereal-time lookup table.
   * @param {number} unixMs
   * @returns {number} [0, 1)
   */
  function dayFraction(unixMs) {
    var ms = unixMs % 86400000;
    if (ms < 0) ms += 86400000;
    return ms / 86400000;
  }

  root.SMRC.time = {
    UNIX_EPOCH_JD: UNIX_EPOCH_JD,
    J2000: J2000,
    SECONDS_PER_DAY: SECONDS_PER_DAY,
    julianDay: julianDay,
    julianDayFromUnixMs: julianDayFromUnixMs,
    centuriesJ2000: centuriesJ2000,
    isValidTimeZone: isValidTimeZone,
    offsetMinutesAt: offsetMinutesAt,
    zonedTimeToUtc: zonedTimeToUtc,
    formatOffset: formatOffset,
    greenwichMeanSiderealTime: greenwichMeanSiderealTime,
    greenwichApparentSiderealTime: greenwichApparentSiderealTime,
    localApparentSiderealTime: localApparentSiderealTime,
    dayFraction: dayFraction
  };
})(typeof window !== 'undefined' ? window : globalThis);
