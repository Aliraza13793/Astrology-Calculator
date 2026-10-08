/* Finding the moments an astrology calendar is made of: equinoxes and
   solstices, new and full Moons, the Moon changing sign, and the planets
   stationing retrograde.

   Two different kinds of root are involved and they need two different methods.

   The Sun's longitude, the Moon's longitude, and their elongation all move
   steadily in one direction, so an event is where one of them reaches a target
   angle. Those quantities are published wrapped into [0, 360), so they are
   unwrapped along a scan first: comparing each sample with the one before it
   and accumulating the small increment gives a continuous running value, and
   a target is then a plain rising crossing of a quantity that never jumps.
   Doing it by looking for sign changes of a wrapped difference instead would
   also fire at the antipode, which is a discontinuity rather than an event.

   A retrograde station is the other kind: the body's longitude *rate* passing
   through zero, which is a genuine sign change of a smooth function and needs
   no unwrapping.

   No DOM, no I/O. Times come back as Julian days so the caller can render them
   in whatever timezone the reader is actually in. */
(function (root) {
  'use strict';

  var M = root.SMRC.math;
  var T = root.SMRC.time;
  var E = root.SMRC.ephemeris;
  var P = root.SMRC.planets;

  var SOLAR = [
    { angle: 0, name: 'March Equinox', season: 'spring' },
    { angle: 90, name: 'June Solstice', season: 'summer' },
    { angle: 180, name: 'September Equinox', season: 'autumn' },
    { angle: 270, name: 'December Solstice', season: 'winter' }
  ];

  var PHASES = [
    { angle: 0, name: 'New Moon' },
    { angle: 180, name: 'Full Moon' }
  ];

  /* Sign boundaries, as target longitudes for the Moon's ingress. */
  var SIGN_ANGLES = [];
  for (var i = 0; i < 12; i++) SIGN_ANGLES.push(i * 30);

  /**
   * Sample a steadily increasing angle and unwrap it into a running total.
   *
   * @param {function(number): number} angleOf returns a wrapped angle in degrees
   * @param {number} from Julian day
   * @param {number} to Julian day
   * @param {number} step days
   * @returns {{jd: number, u: number}[]} u is continuous and increasing
   */
  function track(angleOf, from, to, step) {
    var samples = [];
    var previousWrapped = angleOf(from);
    var running = previousWrapped;
    samples.push({ jd: from, u: running });
    for (var jd = from + step; jd <= to + step * 0.5; jd += step) {
      var wrappedNow = angleOf(jd);
      running += M.angleDiff(previousWrapped, wrappedNow);
      samples.push({ jd: jd, u: running });
      previousWrapped = wrappedNow;
    }
    return samples;
  }

  /**
   * Moments at which a tracked running value passes any of the target angles,
   * including each turn of 360 degrees.
   *
   * @param {{jd: number, u: number}[]} samples from track
   * @param {number[]} targets angles in [0, 360)
   * @param {number} [tolerance] reject a crossing nearer than this to a sample
   * @returns {{jd: number, target: number}[]}
   */
  function solveTargets(samples, targets, tolerance) {
    var tol = tolerance || 1e-9;
    var out = [];
    var last = samples[samples.length - 1];
    for (var t = 0; t < targets.length; t++) {
      var target = targets[t];
      /* Every turn of 360 degrees that falls inside the scanned range is a
         separate crossing. The Moon covers more than thirteen turns a year, so
         this has to be driven by the data rather than by a fixed count. */
      var firstTurn = Math.floor((samples[0].u - target) / 360) - 1;
      var lastTurn = Math.ceil((last.u - target) / 360) + 1;
      for (var turn = firstTurn; turn <= lastTurn; turn++) {
        var goal = target + 360 * turn;
        for (var i = 0; i + 1 < samples.length; i++) {
          var lo = samples[i];
          var hi = samples[i + 1];
          if (lo.u >= goal || hi.u < goal) continue;
          var a = lo.jd;
          var b = hi.jd;
          for (var k = 0; k < 50; k++) {
            var mid = (a + b) / 2;
            var uMid = interpolate(lo, hi, mid);
            if (uMid < goal) a = mid; else b = mid;
          }
          var at = (a + b) / 2;
          /* A crossing landing within a sample step of the end of the scan is
             a different turn of the cycle seen from outside; drop it. */
          if (at > last.jd - tol) continue;
          if (at < samples[0].jd + tol) continue;
          out.push({ jd: at, target: target });
          break;
        }
      }
    }
    return out;
  }

  function interpolate(lo, hi, jd) {
    var f = (jd - lo.jd) / (hi.jd - lo.jd);
    return lo.u + f * (hi.u - lo.u);
  }

  /**
   * Equinoxes and solstices in a calendar year, solved from the Sun's own
   * apparent longitude rather than looked up in a table of dates, so they stay
   * right for years no table covers.
   *
   * @param {number} year
   * @returns {{jd: number, name: string, season: string, longitude: number}[]}
   */
  function solarTerms(year) {
    var from = T.julianDay(year, 1, 1);
    var to = T.julianDay(year + 1, 1, 1);
    var samples = track(function (jd) { return E.sun(jd).longitude; }, from, to, 1);
    var angles = [];
    for (var i = 0; i < SOLAR.length; i++) angles.push(SOLAR[i].angle);
    var solved = solveTargets(samples, angles);
    var out = [];
    for (var k = 0; k < solved.length; k++) {
      var term = SOLAR[indexOfAngle(solved[k].target)];
      out.push({
        jd: solved[k].jd,
        name: term.name,
        season: term.season,
        longitude: term.angle
      });
    }
    out.sort(function (a, b) { return a.jd - b.jd; });
    return out;
  }

  function indexOfAngle(angle) {
    for (var i = 0; i < SOLAR.length; i++) if (SOLAR[i].angle === angle) return i;
    return 0;
  }

  /**
   * New and full Moons, from the geocentric elongation between Sun and Moon.
   * The elongation grows steadily because the Moon overtakes the Sun about
   * 12.2 degrees a day, so both events are rising crossings of the unwrapped
   * total.
   *
   * @param {number} year
   * @returns {{jd: number, phase: string, angle: number}[]}
   */
  function moonPhases(year) {
    var from = T.julianDay(year, 1, 1);
    var to = T.julianDay(year + 1, 1, 1);
    var samples = track(function (jd) {
      return M.norm360(E.moon(jd).longitude - E.sun(jd).longitude);
    }, from, to, 0.25);
    var angles = [];
    for (var i = 0; i < PHASES.length; i++) angles.push(PHASES[i].angle);
    var solved = solveTargets(samples, angles);
    var out = [];
    for (var k = 0; k < solved.length; k++) {
      var phase = PHASES[solved[k].target === 0 ? 0 : 1];
      out.push({ jd: solved[k].jd, phase: phase.name, angle: phase.angle });
    }
    out.sort(function (a, b) { return a.jd - b.jd; });
    return out;
  }

  /**
   * Every moment the Moon enters a new sign in a calendar year, which is
   * about thirteen times.
   *
   * @param {number} year
   * @returns {{jd: number, signIndex: number, sign: object}[]}
   */
  function moonSignChanges(year) {
    var from = T.julianDay(year, 1, 1);
    var to = T.julianDay(year + 1, 1, 1);
    var samples = track(function (jd) { return E.moon(jd).longitude; }, from, to, 0.25);
    var solved = solveTargets(samples, SIGN_ANGLES);
    var out = [];
    for (var i = 0; i < solved.length; i++) {
      var index = solved[i].target / 30;
      out.push({
        jd: solved[i].jd,
        signIndex: index,
        sign: root.SMRC.data.signs[index]
      });
    }
    out.sort(function (a, b) { return a.jd - b.jd; });
    return out;
  }

  /**
   * Sign changes of a smooth function, by bracketing then bisecting. Used for
   * the stations, where the function is the longitude rate and both directions
   * are meaningful.
   *
   * @param {function(number): number} fn
   * @param {number} from Julian day
   * @param {number} to Julian day
   * @param {number} step coarse scan step in days
   * @returns {number[]}
   */
  function crossings(fn, from, to, step) {
    var out = [];
    var previousX = from;
    var previousY = fn(from);
    for (var x = from + step; x <= to + step * 0.5; x += step) {
      var y = fn(x);
      if (previousY < 0 !== y < 0) {
        var lo = previousX;
        var hi = x;
        var flo = previousY;
        for (var i = 0; i < 50; i++) {
          var mid = (lo + hi) / 2;
          var fm = fn(mid);
          if (flo < 0 === fm < 0) { lo = mid; flo = fm; } else hi = mid;
        }
        out.push((lo + hi) / 2);
      }
      previousX = x;
      previousY = y;
    }
    return out;
  }

  /**
   * Retrograde stations for one planet: the moments its longitude rate crosses
   * zero. The scan is padded either side so a station on 1 January is not lost
   * to the edge, and the results are then trimmed back to the year asked for.
   *
   * A station too close to the Sun to see is reported as unobservable rather
   * than dropped, because it still happens.
   *
   * @param {string} body key in SMRC.planets
   * @param {number} year
   * @returns {{jd: number, body: string, retrograde: boolean, longitude: number,
   *   signIndex: number, observable: boolean}[]}
   */
  function stations(body, year) {
    var yearStart = T.julianDay(year, 1, 1);
    var yearEnd = T.julianDay(year + 1, 1, 1);
    var rate = function (jd) { return P.longitudeRate(body, jd, 0.5); };
    var found = crossings(rate, yearStart - 45, yearEnd + 45, 2);
    var out = [];
    for (var i = 0; i < found.length; i++) {
      var jd = found[i];
      if (jd < yearStart || jd >= yearEnd) continue;
      var pos = P.apparent(body, jd);
      var separation = Math.abs(M.angleDiff(pos.longitude, E.sun(jd).longitude));
      out.push({
        jd: jd,
        body: body,
        retrograde: rate(jd + 1) < 0,
        longitude: pos.longitude,
        signIndex: root.SMRC.zodiac.fromLongitude(pos.longitude).index,
        observable: separation > 8
      });
    }
    return out;
  }

  /**
   * Everything a year-long calendar needs.
   *
   * @param {number} year
   * @param {{bodies?: string[]}} [options] planets to watch for stations
   * @returns {object} categories, plus a flat `all` timeline in time order
   */
  function year(year, options) {
    var bodies = (options && options.bodies) || P.NAMES;
    var result = {
      year: year,
      solar: solarTerms(year),
      moonPhases: moonPhases(year),
      moonSignChanges: moonSignChanges(year),
      stations: []
    };
    for (var i = 0; i < bodies.length; i++) {
      var found = stations(bodies[i], year);
      for (var k = 0; k < found.length; k++) result.stations.push(found[k]);
    }
    result.stations.sort(function (a, b) { return a.jd - b.jd; });

    result.all = result.solar
      .map(function (e) { return { jd: e.jd, kind: 'solar', title: e.name, detail: e.season, item: e }; })
      .concat(result.moonPhases.map(function (e) { return { jd: e.jd, kind: 'phase', title: e.phase, detail: '', item: e }; }))
      .concat(result.moonSignChanges.map(function (e) { return { jd: e.jd, kind: 'ingress', title: 'Moon enters ' + e.sign.name, detail: '', item: e }; }))
      .concat(result.stations.map(function (e) {
        return {
          jd: e.jd,
          kind: 'station',
          title: capitalise(e.body) + (e.retrograde ? ' turns retrograde' : ' turns direct'),
          detail: e.observable ? 'in ' + root.SMRC.data.signs[e.signIndex].name : 'behind the Sun',
          item: e
        };
      }));
    result.all.sort(function (a, b) { return a.jd - b.jd; });
    return result;
  }

  function capitalise(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  root.SMRC.events = {
    year: year,
    solarTerms: solarTerms,
    moonPhases: moonPhases,
    moonSignChanges: moonSignChanges,
    stations: stations,
    track: track,
    solveTargets: solveTargets,
    crossings: crossings,
    SOLAR: SOLAR,
    PHASES: PHASES
  };
})(typeof window !== 'undefined' ? window : globalThis);
