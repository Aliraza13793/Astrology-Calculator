/* Angle and number helpers. Degrees are the unit at every public boundary. */
(function (root) {
  'use strict';

  var DEG = Math.PI / 180;
  var RAD = 180 / Math.PI;

  function norm360(deg) {
    var v = deg % 360;
    return v < 0 ? v + 360 : v;
  }

  function norm180(deg) {
    var v = norm360(deg);
    return v > 180 ? v - 360 : v;
  }

  function normRad(rad) {
    var v = rad % (2 * Math.PI);
    return v < 0 ? v + 2 * Math.PI : v;
  }

  /* Smallest signed angle from a to b, in (-180, 180]. */
  function angleDiff(a, b) {
    return norm180(b - a);
  }

  function sinDeg(deg) {
    return Math.sin(deg * DEG);
  }

  function cosDeg(deg) {
    return Math.cos(deg * DEG);
  }

  function tanDeg(deg) {
    return Math.tan(deg * DEG);
  }

  function arcsin(x) {
    if (x > 1) x = 1;
    if (x < -1) x = -1;
    return Math.asin(x) * RAD;
  }

  function arccos(x) {
    if (x > 1) x = 1;
    if (x < -1) x = -1;
    return Math.acos(x) * RAD;
  }

  function arctan2(y, x) {
    return Math.atan2(y, x) * RAD;
  }

  function round(value, decimals) {
    var f = Math.pow(10, decimals);
    return Math.round(value * f) / f;
  }

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  root.SMRC = root.SMRC || {};
  root.SMRC.math = {
    DEG: DEG,
    RAD: RAD,
    norm360: norm360,
    norm180: norm180,
    normRad: normRad,
    angleDiff: angleDiff,
    sinDeg: sinDeg,
    cosDeg: cosDeg,
    tanDeg: tanDeg,
    arcsin: arcsin,
    arccos: arccos,
    arctan2: arctan2,
    round: round,
    clamp: clamp
  };
})(typeof window !== 'undefined' ? window : globalThis);
