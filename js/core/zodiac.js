/* Sign boundaries and lookup. A sign owns 30 degrees of ecliptic longitude
   counted from the vernal equinox, so the index is simply the longitude. */
(function (root) {
  'use strict';

  var M = root.SMRC.math;

  function signData() {
    return root.SMRC.data.signs;
  }

  /**
   * Sign containing an ecliptic longitude.
   * @param {number} lam degrees
   * @returns {{index: number, sign: object, degree: number, inSign: number}}
   *   index 0-11, degree 0-30 measured from the start of the sign
   */
  function fromLongitude(lam) {
    var list = signData();
    var lon = M.norm360(lam);
    var index = Math.min(11, Math.floor(lon / 30));
    return {
      index: index,
      sign: list[index],
      degree: lon - index * 30,
      inSign: lon - index * 30
    };
  }

  /**
   * Nearest sign boundary, for the "this is close to a cusp" warning.
   * @param {number} lam degrees
   * @returns {{boundary: number, degreesToBoundary: number, at: 'before'|'after'}}
   */
  function nearestBoundary(lam) {
    var lon = M.norm360(lam);
    var offset = lon % 30;
    if (offset <= 15) {
      return {
        boundary: M.norm360(lon - offset),
        degreesToBoundary: offset,
        at: 'after'
      };
    }
    return {
      boundary: M.norm360(lon + (30 - offset)),
      degreesToBoundary: 30 - offset,
      at: 'before'
    };
  }

  /**
   * Degree within the sign, rendered the way astrologers write it.
   * @param {number} degree 0-30
   * @returns {string} e.g. '14°32''
   */
  function formatDegree(degree) {
    var d = Math.floor(degree);
    var m = (degree - d) * 60;
    return d + '°' + (m < 10 ? '0' : '') + Math.floor(m) + '\u2032';
  }

  /**
   * Full ecliptic longitude, formatted.
   * @param {number} lam degrees
   * @returns {string} e.g. '14°32\u2032 Taurus'
   */
  function formatLongitude(lam) {
    var at = fromLongitude(lam);
    return formatDegree(at.degree) + ' ' + at.sign.name;
  }

  function elementsOf(list) {
    var counts = { fire: 0, earth: 0, air: 0, water: 0 };
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].sign) counts[list[i].sign.element] += 1;
    }
    return counts;
  }

  function modalitiesOf(list) {
    var counts = { cardinal: 0, fixed: 0, mutable: 0 };
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].sign) counts[list[i].sign.modality] += 1;
    }
    return counts;
  }

  /**
   * Signs held by a given traditional ruler, used to cross-check the Rising
   * sign against its dispositor.
   * @param {string} planet
   * @returns {number[]} sign indices
   */
  function signsRuledBy(planet) {
    var list = signData();
    var out = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].rulers.indexOf(planet) !== -1) out.push(i);
    }
    return out;
  }

  root.SMRC.zodiac = {
    fromLongitude: fromLongitude,
    nearestBoundary: nearestBoundary,
    formatDegree: formatDegree,
    formatLongitude: formatLongitude,
    elementsOf: elementsOf,
    modalitiesOf: modalitiesOf,
    signsRuledBy: signsRuledBy
  };
})(typeof window !== 'undefined' ? window : globalThis);
