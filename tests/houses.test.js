'use strict';

const assert = require('assert');
const H = globalThis.SMRC.houses;
const T = globalThis.SMRC.time;
const M = globalThis.SMRC.math;

/* Independent horizontal coordinates, built by projecting the object's
   equatorial vector onto the local horizon frame rather than by the horizon
   equation SMRC.houses uses. If the two disagree, at least one is wrong. */
function altAz(lam, latitude, last) {
  const d2r = Math.PI / 180;
  const lamR = lam * d2r;
  const latR = latitude * d2r;
  const thR = last * d2r;
  const epsR = OBL * d2r;

  /* Ecliptic to equatorial unit vector. */
  const r = [
    Math.cos(lamR),
    Math.cos(lamR) * 0 + Math.sin(lamR) * Math.cos(epsR),
    Math.sin(lamR) * Math.sin(epsR)
  ];
  /* Local frame: zenith, north, east. */
  const up = [Math.cos(latR) * Math.cos(thR), Math.cos(latR) * Math.sin(thR), Math.sin(latR)];
  const north = [-Math.sin(latR) * Math.cos(thR), -Math.sin(latR) * Math.sin(thR), Math.cos(latR)];
  const east = [-Math.sin(thR), Math.cos(thR), 0];

  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const alt = Math.asin(Math.max(-1, Math.min(1, dot(r, up)))) / d2r;
  const az = (Math.atan2(dot(r, east), dot(r, north)) / d2r + 360) % 360;
  return { alt: alt, az: az };
}

const OBL = 23.4392911;

function lastFor(jd, lon) {
  return T.localApparentSiderealTime(
    T.greenwichApparentSiderealTime(jd, 0, OBL), lon
  );
}

function angleAt(jd, lat, lon) {
  return H.angles(lastFor(jd, lon), lat, OBL);
}

const CASES = [
  { label: 'London', lat: 51.5074, lon: -0.1278, jd: T.julianDay(2024, 3, 20) + 0.5 },
  { label: 'Quito', lat: -0.1807, lon: -78.4678, jd: T.julianDay(2021, 12, 21) + 0.75 },
  { label: 'Sydney', lat: -33.8688, lon: 151.2093, jd: T.julianDay(1998, 6, 1) + 0.3 },
  { label: 'Reykjavik', lat: 64.1466, lon: -21.9426, jd: T.julianDay(1977, 9, 9) + 0.9 },
  { label: 'Buenos Aires', lat: -34.6037, lon: -58.3816, jd: T.julianDay(2005, 11, 11) + 0.5 }
];

describe('houses.angles', () => {
  it('puts the Ascendant on the rising half of the horizon', () => {
    for (const c of CASES) {
      const a = angleAt(c.jd, c.lat, c.lon);
      const last = lastFor(c.jd, c.lon);
      const atAsc = altAz(a.ascendant, c.lat, last);
      const atDsc = altAz(a.descendant, c.lat, last);
      const ascRa = H.equatorial(a.ascendant, OBL).ra;
      const dscRa = H.equatorial(a.descendant, OBL).ra;

      assert.ok(Math.abs(atAsc.alt) < 0.01, c.label + ' asc altitude ' + atAsc.alt);
      assert.ok(
        atAsc.az > 0 && atAsc.az < 180,
        c.label + ' asc is not on the eastern horizon: azimuth ' + atAsc.az
      );
      assert.ok(Math.abs(atDsc.alt) < 0.01, c.label + ' desc altitude ' + atDsc.alt);
      assert.ok(
        atDsc.az > 180 && atDsc.az < 360,
        c.label + ' desc is not on the western horizon: azimuth ' + atDsc.az
      );

      /* A negative hour angle is the definition of rising. */
      const ascH = M.norm360(last - ascRa);
      const dscH = M.norm360(last - dscRa);
      assert.ok(ascH > 180 && ascH < 360, c.label + ' asc hour angle ' + ascH);
      assert.ok(dscH < 180, c.label + ' desc hour angle ' + dscH);
    }
  });

  it('puts the MC on the upper meridian, above the horizon', () => {
    for (const c of CASES) {
      const a = angleAt(c.jd, c.lat, c.lon);
      const last = lastFor(c.jd, c.lon);
      const atMc = altAz(a.mc, c.lat, last);
      const atIc = altAz(a.imumCoeli, c.lat, last);

      assert.ok(atMc.alt > 0, c.label + ' mc altitude ' + atMc.alt);
      assert.ok(atIc.alt < 0, c.label + ' ic altitude ' + atIc.alt);
      assert.ok(
        Math.abs(atMc.az - 180) < 0.05 || Math.abs(atMc.az) < 0.05,
        c.label + ' mc azimuth ' + atMc.az
      );
    }
  });

  it('gives the MC a right ascension equal to the local sidereal time', () => {
    for (const c of CASES) {
      const a = angleAt(c.jd, c.lat, c.lon);
      const last = T.localApparentSiderealTime(
        T.greenwichApparentSiderealTime(c.jd, 0, OBL), c.lon
      );
      const mc = H.equatorial(a.mc, OBL);
      assert.ok(
        Math.abs(M.norm180(mc.ra - last)) < 1e-6,
        c.label + ' mc ra ' + mc.ra + ' last ' + last
      );
    }
  });

  it('puts the Ascendant a quarter turn from the meridian on the equator', () => {
    for (const hour of [0.1, 0.4, 0.7, 0.95]) {
      const jd = T.julianDay(2023, 4, 1) + hour;
      const last = lastFor(jd, 0);
      const a = H.angles(last, 0, OBL);
      /* On the equator the horizon is the celestial equator, so the point on it
         is exactly 90 degrees of right ascension from the meridian. */
      const ra = H.equatorial(a.ascendant, OBL).ra;
      const offset = Math.abs(M.angleDiff(last, ra));
      assert.ok(
        Math.abs(offset - 90) < 1e-9 || Math.abs(offset - 270) < 1e-9,
        'right ascension offset ' + offset
      );
    }
  });

  it('keeps the Ascendant within 20 degrees of the MC in ecliptic longitude', () => {
    for (const hour of [0.1, 0.4, 0.7, 0.95]) {
      const jd = T.julianDay(2023, 4, 1) + hour;
      const a = angleAt(jd, 0, 0);
      const gap = M.norm360(a.ascendant - a.mc);
      /* The obliquity stretches the quarter turn in right ascension by up to
         about 5 degrees when expressed in ecliptic longitude. */
      assert.ok(
        Math.abs(gap - 90) < 6 || Math.abs(gap - 270) < 6,
        'gap ' + gap
      );
    }
  });

  it('moves the Ascendant forward between 10 and 17 degrees an hour', () => {
    const jd = T.julianDay(2023, 4, 1);
    for (const lat of [0, 25, 51.5]) {
      const a = angleAt(jd, lat, 0);
      const b = angleAt(jd + 1 / 24, lat, 0);
      const drift = M.norm360(b.ascendant - a.ascendant);
      assert.ok(drift > 10 && drift < 17, 'lat ' + lat + ' drift ' + drift);
    }
  });

  it('round trips between ecliptic and right ascension', () => {
    for (const lam of [0, 37.5, 90, 180, 271.25, 359]) {
      const eq = H.equatorial(lam, OBL);
      const back = H.longitudeFromRightAscension(eq.ra, OBL);
      assert.ok(
        Math.abs(M.angleDiff(back, lam)) < 1e-9,
        'lam ' + lam + ' back ' + back
      );
    }
  });
});

describe('houses.wholeSign', () => {
  it('starts every cusp a whole sign from the Ascendant', () => {
    for (const c of CASES) {
      const a = angleAt(c.jd, c.lat, c.lon);
      const h = H.wholeSign(a.ascendant);
      assert.strictEqual(h.cusps.length, 12, c.label);
      assert.strictEqual(h.system, 'whole-sign');
      assert.strictEqual(h.cusps[0], a.ascendant);
      for (let i = 1; i < 12; i++) {
        assert.ok(
          Math.abs(M.angleDiff(h.cusps[i], a.ascendant + i * 30)) < 1e-9,
          c.label + ' cusp ' + (i + 1)
        );
      }
    }
  });

  it('puts the 7th cusp on the Descendant', () => {
    for (const c of CASES) {
      const a = angleAt(c.jd, c.lat, c.lon);
      const k = H.wholeSign(a.ascendant);
      assert.strictEqual(k.cusps[6], a.descendant, c.label);
    }
  });

  it('works at latitudes where quadrant systems stop being defined', () => {
    for (const lat of [0, 23.4, 66.5, 78.2, 89, -89]) {
      const a = angleAt(T.julianDay(2023, 6, 1), lat, 15.6);
      const k = H.wholeSign(a.ascendant);
      assert.strictEqual(k.exact, true);
      assert.strictEqual(k.cusps[0], a.ascendant);
    }
  });

  it('puts the Midheaven behind the Ascendant, in houses 7 to 12', () => {
    /* The MC is on the meridian and the Ascendant is on the eastern horizon, so
       the MC always precedes the Ascendant in ecliptic longitude. In whole sign
       that confines it to the second half of the chart. */
    for (const c of CASES) {
      const a = angleAt(c.jd, c.lat, c.lon);
      const k = H.wholeSign(a.ascendant);
      const house = H.houseOf(k.cusps, a.mc);
      assert.ok(house >= 7 && house <= 12, c.label + ' mc in house ' + house);
      assert.ok(M.angleDiff(a.ascendant, a.mc) < 0, c.label);
    }
  });

  it('places a longitude in the house between the cusps around it', () => {
    const c = CASES[0];
    const a = angleAt(c.jd, c.lat, c.lon);
    const k = H.wholeSign(a.ascendant);
    for (let i = 0; i < 12; i++) {
      const start = k.cusps[i];
      const span = M.norm360(k.cusps[(i + 1) % 12] - start);
      const inside = M.norm360(start + span * 0.05);
      assert.strictEqual(H.houseOf(k.cusps, inside), i + 1, 'cusp ' + (i + 1));
      assert.strictEqual(H.houseOf(k.cusps, start), i + 1, 'exactly on cusp ' + (i + 1));
    }
    const p = H.placement(M.norm360(k.cusps[0] + 3), k.cusps);
    assert.strictEqual(p.house, 1);
    assert.strictEqual(p.decanate, 1);
    assert.strictEqual(p.sign, Math.floor(M.norm360(k.cusps[0] + 3) / 30) + 1);
  });

  it('assigns every degree of the circle to exactly one house', () => {
    const c = CASES[0];
    const a = angleAt(c.jd, c.lat, c.lon);
    const k = H.wholeSign(a.ascendant);
    const counts = new Array(13).fill(0);
    for (let lam = 0; lam < 360; lam += 0.1) {
      counts[H.houseOf(k.cusps, lam)]++;
    }
    for (let h = 1; h <= 12; h++) {
      assert.ok(counts[h] > 0, 'house ' + h + ' never matched');
    }
  });

  it('gives every house exactly one whole sign', () => {
    const asc = 100;
    const k = H.wholeSign(asc);
    const ascSign = globalThis.SMRC.zodiac.fromLongitude(asc).index;
    for (let i = 0; i < 12; i++) {
      const houseSign = globalThis.SMRC.zodiac.fromLongitude(k.cusps[i] + 15).index;
      assert.strictEqual(houseSign, (ascSign + i) % 12, 'house ' + (i + 1));
      assert.ok(
        Math.abs(M.angleDiff(k.cusps[i], k.cusps[0] + i * 30)) < 1e-9,
        'cusp ' + (i + 1) + ' is not 30 degrees from the Ascendant'
      );
    }
  });
});
