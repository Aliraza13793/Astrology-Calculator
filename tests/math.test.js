'use strict';

const assert = require('assert');
const M = globalThis.SMRC.math;

describe('math', () => {
  it('normalises angles into [0, 360)', () => {
    assert.strictEqual(M.norm360(0), 0);
    assert.strictEqual(M.norm360(360), 0);
    assert.strictEqual(M.norm360(-1), 359);
    assert.strictEqual(M.norm360(725.5), 5.5);
  });

  it('normalises angles into (-180, 180]', () => {
    assert.strictEqual(M.norm180(0), 0);
    assert.strictEqual(M.norm180(180), 180);
    assert.strictEqual(M.norm180(181), -179);
    assert.strictEqual(M.norm180(-90), -90);
    assert.strictEqual(M.norm180(270), -90);
  });

  it('takes the shortest signed difference', () => {
    assert.strictEqual(M.angleDiff(350, 10), 20);
    assert.strictEqual(M.angleDiff(10, 350), -20);
    assert.strictEqual(M.angleDiff(0, 0), 0);
  });

  it('round trips degrees and radians', () => {
    for (const deg of [0, 1, 23.4392911, 90, 180, 271.5, 359.999]) {
      const back = M.arctan2(M.sinDeg(deg), M.cosDeg(deg));
      assert.ok(Math.abs(M.norm360(back) - M.norm360(deg)) < 1e-9, 'failed at ' + deg);
    }
  });

  it('clamps inverse trig inputs instead of returning NaN', () => {
    assert.strictEqual(M.arcsin(1.0000001), 90);
    assert.strictEqual(M.arcsin(-2), -90);
    assert.strictEqual(M.arccos(3), 0);
  });

  it('rounds and clamps', () => {
    assert.strictEqual(M.round(1.23456, 2), 1.23);
    assert.strictEqual(M.round(9.999, 0), 10);
    assert.strictEqual(M.clamp(5, 0, 3), 3);
    assert.strictEqual(M.clamp(-5, 0, 3), 0);
  });
});
