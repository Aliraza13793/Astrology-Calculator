/* Apparent geocentric ecliptic positions of the Sun and the Moon.
   Reference: Jean Meeus, Astronomical Algorithms, 2nd ed.
     ch. 22 nutation in longitude and true obliquity
     ch. 25 solar coordinates (higher accuracy, the L0 series)
     ch. 47 position of the Moon (truncation of ELP-2000/82)
   Angles are degrees, distances are kilometres. */
(function (root) {
  'use strict';

  var M = root.SMRC.math;

  /* Table 47.A, the periodic terms for longitude and distance.
     Columns: D, M, M', F, sigma-l (1e-6 deg), sigma-r (1e-3 km). */
  var MOON_LR = [
    [0, 0, 1, 0, 6288774, -20905355],
    [2, 0, -1, 0, 1274027, -3699111],
    [2, 0, 0, 0, 658314, -2955968],
    [0, 0, 2, 0, 213618, -569925],
    [0, 1, 0, 0, -185116, 48888],
    [0, 0, 0, 2, -114332, -3149],
    [2, 0, -2, 0, 58793, 246158],
    [2, -1, -1, 0, 57066, -152138],
    [2, 0, 1, 0, 53322, -170733],
    [2, -1, 0, 0, 45758, -204586],
    [0, 1, -1, 0, -40923, -129620],
    [1, 0, 0, 0, -34720, 108743],
    [0, 1, 1, 0, -30383, 104755],
    [2, 0, 0, -2, 15327, 10321],
    [0, 0, 1, 2, -12528, 0],
    [0, 0, 1, -2, 10980, 79661],
    [4, 0, -1, 0, 10675, -34782],
    [0, 0, 3, 0, 10034, -23210],
    [4, 0, -2, 0, 8548, -21636],
    [2, 1, -1, 0, -7888, 24208],
    [2, 1, 0, 0, -6766, 30824],
    [1, 0, -1, 0, -5163, -8379],
    [1, 1, 0, 0, 4987, -16675],
    [2, -1, 1, 0, 4036, -12831],
    [2, 0, 2, 0, 3994, -10445],
    [4, 0, 0, 0, 3861, -11650],
    [2, 0, -3, 0, 3665, 14403],
    [0, 1, -2, 0, -2689, -7003],
    [2, 0, -1, 2, -2602, 0],
    [2, -1, -2, 0, 2390, 10056],
    [1, 0, 1, 0, -2348, 6322],
    [2, -2, 0, 0, 2236, -9884],
    [0, 1, 2, 0, -2120, 5751],
    [0, 2, 0, 0, -2069, 0],
    [2, -2, -1, 0, 2048, -4950],
    [2, 0, 1, -2, -1773, 4130],
    [2, 0, 0, 2, -1595, 0],
    [4, -1, -1, 0, 1215, -3958],
    [0, 0, 2, 2, -1110, 0],
    [3, 0, -1, 0, -892, 3258],
    [2, 1, 1, 0, -810, 2616],
    [4, -1, -2, 0, 759, -1897],
    [0, 2, -1, 0, -713, -2117],
    [2, 2, -1, 0, -700, 2354],
    [2, 1, -2, 0, 691, 0],
    [2, -1, 0, -2, 596, 0],
    [4, 0, 1, 0, 549, -1423],
    [0, 0, 4, 0, 537, -1117],
    [4, -1, 0, 0, 520, -1571],
    [1, 0, -2, 0, -487, -1739],
    [2, 1, 0, -2, -399, 0],
    [0, 0, 2, -2, -381, -4421],
    [1, 1, 1, 0, 351, 0],
    [3, 0, -2, 0, -340, 0],
    [4, 0, -3, 0, 330, 0],
    [2, -1, 2, 0, 327, 0],
    [0, 2, 1, 0, -323, 1165],
    [1, 1, -1, 0, 299, 0],
    [2, 0, 3, 0, 294, 0],
    [2, 0, -1, -2, 0, 8752]
  ];

  /* The full VSOP87 L0 series for the Sun is deliberately not used. Meeus
     25.2 gives the Sun to 0.01 degrees, which is a hundredth of the width of a
     sign, and a short published formula cannot be misremembered the way a
     sixty term table can. See SPEC.md, "Accuracy". */

  /**
   * Nutation in longitude and the true obliquity of the ecliptic.
   * Uses the abridged series of Meeus 22, good to 0.5" in longitude and 0.01"
   * in obliquity, which is far below the truncation error of the Moon series.
   * @param {number} jd Julian day
   * @returns {{nutationLon: number, nutationObl: number, obliquity: number,
   *            meanObliquity: number, omega: number}} degrees / degrees
   */
  function nutationAndObliquity(jd) {
    var t = root.SMRC.time.centuriesJ2000(jd);

    var omega = 125.04452 - 1934.136261 * t;
    var lSun = 280.4665 + 36000.7698 * t;
    var lMoon = 218.3165 + 481267.8813 * t;

    var meanObliquity = 23 + 26 / 60 + 21.448 / 3600
      - (46.8150 * t + 0.00059 * t * t - 0.001813 * t * t * t) / 3600;

    var dPsi = (-17.20 * M.sinDeg(omega)
      - 1.32 * M.sinDeg(2 * lSun)
      - 0.23 * M.sinDeg(2 * lMoon)
      + 0.21 * M.sinDeg(2 * omega)) / 3600;

    var dEps = (9.20 * M.cosDeg(omega)
      + 0.57 * M.cosDeg(2 * lSun)
      + 0.10 * M.cosDeg(2 * lMoon)
      - 0.09 * M.cosDeg(2 * omega)) / 3600;

    return {
      nutationLon: dPsi,
      nutationObl: dEps,
      meanObliquity: meanObliquity,
      obliquity: meanObliquity + dEps,
      omega: M.norm360(omega)
    };
  }

  /**
   * Apparent geocentric position of the Sun.
   * Uses the mean longitude and equation of the centre of Meeus 25.2, which is
   * good to 0.01 degrees in longitude, and then adds nutation and the annual
   * aberration. That is three orders of magnitude finer than a sign boundary,
   * so no full VSOP87 series is warranted here.
   * @param {number} jd Julian day
   * @returns {{longitude: number, latitude: number, distance: number,
   *            meanLongitude: number, meanAnomaly: number,
   *            trueLongitude: number, nutationLon: number}} degrees, km
   */
  function sun(jd) {
    var t = root.SMRC.time.centuriesJ2000(jd);

    var meanLongitude = M.norm360(
      280.4665 + 36000.7698 * t + 0.0003032 * t * t
    );
    var meanAnomaly = M.norm360(
      357.52911 + 35999.05029 * t - 0.0001537 * t * t
    );

    var c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * M.sinDeg(meanAnomaly)
      + (0.019993 - 0.000101 * t) * M.sinDeg(2 * meanAnomaly)
      + 0.000289 * M.sinDeg(3 * meanAnomaly);

    var trueLongitude = meanLongitude + c;
    var trueAnomaly = meanAnomaly + c;

    var eccentricity = 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t;
    var radiusVector = (1.000001018 * (1 - eccentricity * eccentricity))
      / (1 + eccentricity * M.cosDeg(trueAnomaly));

    var nut = nutationAndObliquity(jd);
    var aberration = -20.4898 / radiusVector / 3600;

    return {
      longitude: M.norm360(trueLongitude + nut.nutationLon + aberration),
      latitude: 0,
      distance: radiusVector * 149597870.7,
      meanLongitude: meanLongitude,
      meanAnomaly: meanAnomaly,
      trueLongitude: M.norm360(trueLongitude),
      nutationLon: nut.nutationLon
    };
  }

  /**
   * Apparent geocentric position of the Moon, longitude only.
   * Ecliptic latitude is deliberately not computed: it never exceeds 5.16
   * degrees, it does not change which sign the Moon occupies, and a partial
   * series would be worse than none. See SPEC.md, "Deliberate omissions".
   * @param {number} jd Julian day
   * @returns {{longitude: number, distance: number, meanLongitude: number,
   *            meanAnomaly: number, meanDistance: number}} degrees, km
   */
  function moon(jd) {
    var t = root.SMRC.time.centuriesJ2000(jd);

    var lp = M.norm360(218.3164477 + 481267.88123421 * t - 0.0015786 * t * t
      + (t * t * t) / 538841 - (t * t * t * t) / 65194000);
    var d = M.norm360(297.8501921 + 445267.1114034 * t - 0.0018819 * t * t
      + (t * t * t) / 545868 - (t * t * t * t) / 113065000);
    var m = M.norm360(357.5291092 + 35999.0502909 * t - 0.0001536 * t * t
      + (t * t * t) / 24490000);
    var mp = M.norm360(134.9633964 + 477198.8675055 * t + 0.0087414 * t * t
      + (t * t * t) / 69699 - (t * t * t * t) / 14712000);
    var f = M.norm360(93.2720950 + 483202.0175233 * t - 0.0036539 * t * t
      - (t * t * t) / 3526000 + (t * t * t * t) / 863310000);

    var a1 = M.norm360(119.75 + 131.849 * t);
    var a2 = M.norm360(53.09 + 479264.290 * t);
    var a3 = M.norm360(313.45 + 481266.484 * t);

    var ecc = 1 - 0.002516 * t - 0.0000074 * t * t;

    var sumL = 0;
    var sumR = 0;
    for (var i = 0; i < MOON_LR.length; i++) {
      var term = MOON_LR[i];
      var arg = term[0] * d
        + term[1] * m
        + term[2] * mp
        + term[3] * f;
      var e = 1;
      if (Math.abs(term[1]) === 1) e = ecc;
      else if (Math.abs(term[1]) === 2) e = ecc * ecc;
      sumL += term[4] * e * M.sinDeg(arg);
      sumR += term[5] * e * M.cosDeg(arg);
    }

    sumL += 3958 * M.sinDeg(a1)
      + 1962 * M.sinDeg(lp - f)
      + 318 * M.sinDeg(a2);

    var nut = nutationAndObliquity(jd);

    return {
      longitude: M.norm360(lp + sumL / 1000000 + nut.nutationLon),
      distance: 385000.56 + sumR / 1000,
      meanLongitude: lp,
      meanAnomaly: m,
      elongation: d,
      sunAnomaly: m,
      moonAnomaly: mp,
      latitudeArgument: f,
      a1: a1,
      a2: a2,
      a3: a3
    };
  }

  /**
   * Illuminated fraction and apparent magnitude of the Moon, from the
   * geocentric elongation between the two bodies (Meeus 48.4).
   * @param {number} sunLongitude degrees
   * @param {number} moonLongitude degrees
   * @param {number} sunDistanceKm
   * @param {number} moonDistanceKm
   * @returns {{phase: number, illumination: number, age: number}} 0=new,
   *   0.25=first quarter, 0.5=full, 0.75=last quarter; illumination 0-1;
   *   age in days since new
   */
  function moonPhase(sunLongitude, moonLongitude, sunDistanceKm, moonDistanceKm) {
    var elongation = M.norm360(moonLongitude - sunLongitude);
    var phase = elongation / 360;
    var iRad = Math.atan2(
      149598000 * M.sinDeg(elongation),
      moonDistanceKm - sunDistanceKm * M.cosDeg(elongation)
    );
    var magnitude = -12.73 + 0.026 * Math.abs(iRad) * M.RAD + 4e-9 * Math.pow(Math.abs(iRad) * M.RAD, 4);
    return {
      phase: phase,
      illumination: (1 + Math.cos(iRad)) / 2,
      age: M.norm360(elongation) / 360.885,
      magnitude: magnitude,
      angle: iRad * M.RAD
    };
  }

  /**
   * Named phase for a phase fraction.
   * @param {number} phase 0-1
   * @returns {string}
   */
  function moonPhaseName(phase) {
    var p = phase;
    if (p < 0.03 || p > 0.97) return 'New Moon';
    if (p < 0.22) return 'Waxing Crescent';
    if (p < 0.28) return 'First Quarter';
    if (p < 0.47) return 'Waxing Gibbous';
    if (p < 0.53) return 'Full Moon';
    if (p < 0.72) return 'Waning Gibbous';
    if (p < 0.78) return 'Last Quarter';
    if (p < 0.97) return 'Waning Crescent';
    return 'New Moon';
  }

  root.SMRC.ephemeris = {
    sun: sun,
    moon: moon,
    moonPhase: moonPhase,
    moonPhaseName: moonPhaseName,
    nutationAndObliquity: nutationAndObliquity,
    MOON_LR: MOON_LR
  };
})(typeof window !== 'undefined' ? window : globalThis);
