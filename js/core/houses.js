/* Angles of the chart: Medium Coeli, Ascendant, and Placidus house cusps.
   The ecliptic point on the eastern horizon satisfies
     cos(lam) cos(phi) cos(theta) + sin(lam) (cos(eps) sin(theta) + sin(eps) tan(phi)) = 0
   after projecting the ecliptic into equatorial coordinates and taking the
   scalar product with the zenith. See Meeus ch. 13 for the horizon geometry. */
(function (root) {
  'use strict';

  var M = root.SMRC.math;
  var T = root.SMRC.time;

  /* Whole sign houses are defined at every latitude, so unlike a quadrant
     system there is no limit to enforce here. See SPEC.md, "House system". */

  /**
   * Right ascension and declination of an ecliptic point at longitude lam.
   * @param {number} lam ecliptic longitude, degrees
   * @param {number} obliquity true obliquity, degrees
   * @returns {{ra: number, dec: number}} degrees
   */
  function equatorial(lam, obliquity) {
    var ra = M.norm360(M.arctan2(
      M.sinDeg(lam) * M.cosDeg(obliquity),
      M.cosDeg(lam)
    ));
    var dec = M.arcsin(M.sinDeg(lam) * M.sinDeg(obliquity));
    return { ra: ra, dec: dec };
  }

  /**
   * Ecliptic longitude of a right ascension for a point of zero ecliptic
   * latitude, which is every point the angle calculations use. Declination is
   * not an input because a declination alone does not determine a longitude
   * once ecliptic latitude is allowed to vary.
   * @param {number} ra degrees
   * @param {number} obliquity degrees
   * @returns {number} longitude in [0, 360)
   */
  function longitudeFromRightAscension(ra, obliquity) {
    return M.norm360(M.arctan2(
      M.sinDeg(ra),
      M.cosDeg(ra) * M.cosDeg(obliquity)
    ));
  }

  /**
   * Medium Coeli, the ecliptic point on the upper meridian. Its right
   * ascension is the local apparent sidereal time, so
   * tan(mc) = tan(LAST) / cos(eps).
   * @param {number} last local apparent sidereal time, degrees
   * @param {number} obliquity true obliquity, degrees
   * @returns {number} ecliptic longitude in [0, 360)
   */
  function mediumCoeli(last, obliquity) {
    return M.norm360(M.arctan2(
      M.sinDeg(last),
      M.cosDeg(last) * M.cosDeg(obliquity)
    ));
  }

  /**
   * Ascendant, the ecliptic point rising on the eastern horizon.
   * The horizon equation has two solutions 180 degrees apart; the Ascendant
   * is the one between the MC and the IC in the direction of increasing
   * longitude, which is the one still above the horizon.
   * @param {number} last local apparent sidereal time, degrees
   * @param {number} latitude degrees, north positive
   * @param {number} obliquity true obliquity, degrees
   * @returns {{ascendant: number, mc: number, descendant: number, imumCoeli: number}}
   */
  function angles(last, latitude, obliquity) {
    var mc = mediumCoeli(last, obliquity);
    var y = -M.cosDeg(last);
    var x = M.cosDeg(obliquity) * M.sinDeg(last)
      + M.sinDeg(obliquity) * M.tanDeg(latitude);
    var first = M.norm360(M.arctan2(y, x));
    var second = M.norm360(first + 180);
    var aheadFirst = M.norm360(first - mc);
    var aheadSecond = M.norm360(second - mc);
    var asc = aheadFirst > 0 && aheadFirst < 180 ? first : second;
    return {
      ascendant: asc,
      mc: mc,
      descendant: M.norm360(asc + 180),
      imumCoeli: M.norm360(mc + 180)
    };
  }
  /**
   * Ascensional difference, the hour-angle half of the time a point spends
   * above the horizon. Kept because it is the quantity Placidus spaces in
   * equal thirds, and because it is a cheap way to reason about whether a
   * quadrant system is defined at all at a given latitude.
   * @param {number} dec declination, degrees
   * @param {number} latitude degrees
   * @returns {number} degrees, clamped to (-90, 90)
   */
  function ascensionalDifference(dec, latitude) {
    var v = M.tanDeg(latitude) * M.tanDeg(dec);
    return M.arcsin(M.clamp(v, -1, 1));
  }

  /* Placidus needs four cusps found by trisecting the ascensional difference
     between the Ascendant and the Midheaven, and a quadrant system then places
     the other six as antipodes. Those two rules contradict each other, and the
     published definitions of the 2nd and 3rd cusps disagree about which
     reading is right, so a Placidus table here would be a plausible looking
     approximation rather than the real thing. See SPEC.md, "House system". */

  /**
   * Whole sign houses: every cusp is a whole 30 degree sign from the
   * Ascendant, so cusp 1 is the Ascendant and cusp 4 the Descendant exactly.
   * Unambiguous at every latitude, and the system most modern astrology
   * software defaults to. The Medium Coeli then falls *inside* the tenth house
   * rather than on its cusp, which is a real difference from Placidus and is
   * reported as such.
   *
   * @param {number} ascendant ecliptic longitude, degrees
   * @returns {{cusps: number[], exact: boolean, system: string}} degrees
   */
  function wholeSign(ascendant) {
    var out = new Array(12);
    for (var i = 0; i < 12; i++) {
      out[i] = M.norm360(ascendant + i * 30);
    }
    return { cusps: out, exact: true, system: 'whole-sign' };
  }

  /**
   * Which house a longitude falls in.
   * @param {number[]} cusps twelve cusp longitudes
   * @param {number} lam ecliptic longitude
   * @returns {number} 1-12
   */
  function houseOf(cusps, lam) {
    for (var i = 0; i < 12; i++) {
      var a = cusps[i];
      var b = cusps[(i + 1) % 12];
      if (b <= a) b += 360;
      var t = M.norm360(lam - a);
      if (t < (b - a)) return i + 1;
    }
    return 1;
  }

  /**
   * Assign a longitude to a body with the house it occupies and the sign
   * span it is in.
   * @param {number} lam
   * @param {number[]} cusps
   * @returns {{house: number, sign: number, degree: number, decanate: number}}
   */
  function placement(lam, cusps) {
    var house = houseOf(cusps, lam);
    var start = cusps[(house - 1) % 12];
    var end = cusps[house % 12];
    if (end <= start) end += 360;
    var into = M.norm360(lam - start);
    var span = end - start;
    return {
      house: house,
      degree: into,
      sign: Math.floor(M.norm360(lam) / 30) + 1,
      decanate: Math.min(3, Math.floor((into / span) * 3) + 1)
    };
  }

  root.SMRC.houses = {
    equatorial: equatorial,
    longitudeFromRightAscension: longitudeFromRightAscension,
    mediumCoeli: mediumCoeli,
    angles: angles,
    ascensionalDifference: ascensionalDifference,
    wholeSign: wholeSign,
    houseOf: houseOf,
    placement: placement
  };
})(typeof window !== 'undefined' ? window : globalThis);
