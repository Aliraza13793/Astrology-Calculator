'use strict';

const assert = require('assert');
const Z = globalThis.SMRC.zodiac;
const S = globalThis.SMRC.data.signs;

describe('zodiac.signs', () => {
  it('holds twelve well formed signs in zodiacal order', () => {
    assert.strictEqual(S.length, 12);
    const expected = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    S.forEach((sign, i) => {
      assert.strictEqual(sign.name, expected[i]);
      assert.ok(['fire', 'earth', 'air', 'water'].includes(sign.element), sign.name);
      assert.ok(['cardinal', 'fixed', 'mutable'].includes(sign.modality), sign.name);
      assert.ok(['yang', 'yin'].includes(sign.polarity), sign.name);
      assert.ok(Array.isArray(sign.rulers) && sign.rulers.length, sign.name);
      assert.ok(sign.sun && sign.moon && sign.rising, sign.name + ' needs three texts');
      assert.ok(sign.strengths && sign.challenges, sign.name);
    });
  });

  it('gives each element and each modality exactly four signs', () => {
    const elements = {};
    const modalities = {};
    S.forEach((s) => {
      elements[s.element] = (elements[s.element] || 0) + 1;
      modalities[s.modality] = (modalities[s.modality] || 0) + 1;
    });
    assert.deepStrictEqual(elements, { fire: 3, earth: 3, air: 3, water: 3 });
    assert.deepStrictEqual(modalities, { cardinal: 4, fixed: 4, mutable: 4 });
  });

  it('maps longitude to sign at the boundaries', () => {
    assert.strictEqual(Z.fromLongitude(0).sign.name, 'Aries');
    assert.strictEqual(Z.fromLongitude(29.999).sign.name, 'Aries');
    assert.strictEqual(Z.fromLongitude(30).sign.name, 'Taurus');
    assert.strictEqual(Z.fromLongitude(59.99).sign.name, 'Taurus');
    assert.strictEqual(Z.fromLongitude(359.99).sign.name, 'Pisces');
    assert.strictEqual(Z.fromLongitude(360).sign.name, 'Aries');
    assert.strictEqual(Z.fromLongitude(-1).sign.name, 'Pisces');
    assert.strictEqual(Z.fromLongitude(0).index, 0);
    assert.strictEqual(Z.fromLongitude(301.5).index, 10);
  });

  it('reports the distance to the nearest boundary', () => {
    const after = Z.nearestBoundary(10);
    assert.strictEqual(after.at, 'after');
    assert.strictEqual(after.degreesToBoundary, 10);
    assert.strictEqual(after.boundary, 0);

    const before = Z.nearestBoundary(50);
    assert.strictEqual(before.at, 'before');
    assert.strictEqual(before.degreesToBoundary, 10);
    assert.strictEqual(before.boundary, 60);

    /* Never more than half a sign away. */
    for (let lam = 0; lam < 360; lam += 0.37) {
      const b = Z.nearestBoundary(lam);
      assert.ok(b.degreesToBoundary >= 0 && b.degreesToBoundary <= 15, 'lam ' + lam);
    }
    assert.strictEqual(Z.nearestBoundary(30).degreesToBoundary, 0);
  });

  it('formats degrees the astrological way', () => {
    assert.strictEqual(Z.formatDegree(14.5), '14\u00B030\u2032');
    assert.strictEqual(Z.formatDegree(0), '0\u00B000\u2032');
    assert.strictEqual(Z.formatLongitude(44.5), '14\u00B030\u2032 Taurus');
    assert.strictEqual(Z.formatLongitude(360), '0\u00B000\u2032 Aries');
  });

  it('tallies elements and modalities across a set of bodies', () => {
    const list = [
      { sign: S[0] },
      { sign: S[4] },
      { sign: S[3] }
    ];
    assert.deepStrictEqual(Z.elementsOf(list), { fire: 2, earth: 0, air: 0, water: 1 });
    assert.deepStrictEqual(Z.modalitiesOf(list), { cardinal: 2, fixed: 1, mutable: 0 });
  });

  it('knows which signs each traditional ruler holds', () => {
    assert.deepStrictEqual(Z.signsRuledBy('mars'), [0, 7]);
    assert.deepStrictEqual(Z.signsRuledBy('venus'), [1, 6]);
    assert.deepStrictEqual(Z.signsRuledBy('moon'), [3]);
    assert.deepStrictEqual(Z.signsRuledBy('sun'), [4]);
    assert.deepStrictEqual(Z.signsRuledBy('jupiter'), [8, 11]);
  });
});
