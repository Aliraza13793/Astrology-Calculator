/* Apparent geocentric positions of the five planets the calendar and the
   compatibility reading need: Mercury, Venus, Mars, Jupiter and Saturn.

   Reference: VSOP87D (Bretagnon & Francou 1988) as tabulated in Meeus,
   Astronomical Algorithms 2nd ed., Appendix III. The periodic terms live in
   vsop87d.js; this file is the reduction from series to an apparent place.

   Angles are degrees at every public boundary, distances AU. */
(function (root) {
  'use strict';

  var M = root.SMRC.math;

  /* Speed of light in AU per day, from the IAU definition of the au. */
  var C_AU_PER_DAY = 173.1446326846693;

  /* Days of light time per au, 499.004783836 seconds. */
  var LIGHT_DAYS_PER_AU = 0.0057755183;

  var J2000 = 2451545.0;
  var MILLENNIA = 365250.0;

  /**
   * Sum one VSOP87 series at a given tau.
   * tau^order * sum over terms of A * cos(B + C * tau), in radians / au.
   * @param {Array<[number, Array<number[]>]>} series
   * @param {number} tau Julian millennia from J2000
   * @returns {number}
   */
  function sumSeries(series, tau) {
    var total = 0;
    for (var i = 0; i < series.length; i++) {
      var order = series[i][0];
      var terms = series[i][1];
      var inner = 0;
      for (var j = 0; j < terms.length; j++) {
        inner += terms[j][0] * Math.cos(terms[j][1] + terms[j][2] * tau);
      }
      total += Math.pow(tau, order) * inner;
    }
    return total;
  }

  /**
   * Heliocentric rectangular ecliptic coordinates of date for one body.
   * @param {string} name key in SMRC.vsop87d
   * @param {number} jd Julian day
   * @returns {{x: number, y: number, z: number}} au
   */
  function heliocentric(name, jd) {
    var table = root.SMRC.vsop87d[name];
    if (!table) throw new Error('vsop87d: no such body ' + name);
    var tau = (jd - J2000) / MILLENNIA;
    var lon = sumSeries(table.L, tau);
    var lat = sumSeries(table.B, tau);
    var r = sumSeries(table.R, tau);
    var cosLat = Math.cos(lat);
    return {
      x: r * cosLat * Math.cos(lon),
      y: r * cosLat * Math.sin(lon),
      z: r * Math.sin(lat)
    };
  }

  function difference(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  function magnitude(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  /**
   * Apparent geocentric ecliptic longitude, latitude and distance.
   *
   * Three corrections turn the geometric place into the apparent one that an
   * observer actually sees, and all three matter at the tens of arcseconds
   * level: light time moves the planet to where it was when the photons left,
   * annual aberration displaces the direction toward the Earth's motion, and
   * nutation in longitude completes the reduction to the true equinox of date.
   *
   * @param {string} name 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn'
   * @param {number} jd Julian day
   * @returns {{longitude: number, latitude: number, distance: number}} degrees, au
   */
  function apparent(name, jd) {
    var geometric = difference(heliocentric(name, jd), heliocentric('earth', jd));
    var lightTime = magnitude(geometric) * LIGHT_DAYS_PER_AU;
    var jdEmission = jd - lightTime;

    var g = difference(heliocentric(name, jdEmission), heliocentric('earth', jdEmission));

    /* Relative velocity, central difference over one day either side. */
    var step = 0.5;
    var later = difference(heliocentric(name, jdEmission + step), heliocentric('earth', jdEmission + step));
    var earlier = difference(heliocentric(name, jdEmission - step), heliocentric('earth', jdEmission - step));
    var vx = (later.x - earlier.x) / (2 * step);
    var vy = (later.y - earlier.y) / (2 * step);
    var vz = (later.z - earlier.z) / (2 * step);

    var dist = magnitude(g);
    var ux = g.x / dist;
    var uy = g.y / dist;
    var uz = g.z / dist;

    /* Only the transverse part of the relative velocity aberrates. */
    var along = vx * ux + vy * uy + vz * uz;
    var ax = ux + (vx - along * ux) / C_AU_PER_DAY;
    var ay = uy + (vy - along * uy) / C_AU_PER_DAY;
    var az = uz + (vz - along * uz) / C_AU_PER_DAY;

    var nut = root.SMRC.ephemeris.nutationAndObliquity(jd);

    return {
      longitude: M.norm360(M.arctan2(ay, ax) + nut.nutationLon),
      latitude: M.arcsin(az),
      distance: dist
    };
  }

  /**
   * Apparent geocentric position of the Sun, from the Earth term of the same
   * series. The Sun is not tabulated in VSOP87; it is the Earth seen from the
   * other side, so its geocentric place is the Earth's heliocentric place
   * turned through 180 degrees. This exists so the two independently derived
   * solar positions in this project can be cross-checked against each other.
   * @param {number} jd Julian day
   * @returns {{longitude: number, distance: number}} degrees, au
   */
  function sunFromEarth(jd) {
    var e = heliocentric('earth', jd);
    return {
      longitude: M.norm360(M.arctan2(-e.y, -e.x)),
      distance: magnitude(e)
    };
  }

  /**
   * Apparent geocentric longitude rate in degrees per day, by central
   * difference. This is what decides whether a planet is retrograde, and it is
   * far better determined than the longitude itself, because a constant
   * longitude offset cancels out of the difference.
   * @param {string} name body key
   * @param {number} jd Julian day
   * @param {number} [step] half-width of the difference, days
   * @returns {number} degrees per day, negative when retrograde
   */
  function longitudeRate(name, jd, step) {
    var h = step || 0.25;
    return M.angleDiff(apparent(name, jd - h).longitude, apparent(name, jd + h).longitude) / (2 * h);
  }

  /* Distance range in au, used to tell a stationary direct body from a slow
     retrograde one and to sanity check the series in the tests. */
  var RANGES = {
    mercury: [0.307, 0.467],
    venus: [0.718, 0.728],
    mars: [1.381, 1.666],
    jupiter: [4.95, 5.46],
    saturn: [9.02, 10.05]
  };

  root.SMRC.planets = {
    apparent: apparent,
    heliocentric: heliocentric,
    sunFromEarth: sunFromEarth,
    longitudeRate: longitudeRate,
    sumSeries: sumSeries,
    RANGES: RANGES,
    NAMES: ['mercury', 'venus', 'mars', 'jupiter', 'saturn'],
    C_AU_PER_DAY: C_AU_PER_DAY
  };
})(typeof window !== 'undefined' ? window : globalThis);
