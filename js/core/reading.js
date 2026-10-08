/* Analysis only: no prose, no DOM. Turns a chart into aspects, element and
   modality tallies, dispositors, and a list of rule ids for the content
   layer to look up. */
(function (root) {
  'use strict';

  var M = root.SMRC.math;
  var config = root.SMRC.config;

  var ASPECT_ORDER = ['conjunction', 'opposition', 'square', 'trine', 'sextile', 'quincunx'];
  var PAIRS = [
    { key: 'sun-moon', a: 'sun', b: 'moon' },
    { key: 'sun-rising', a: 'sun', b: 'rising' },
    { key: 'moon-rising', a: 'moon', b: 'rising' }
  ];

  /**
   * Which aspect, if any, a separation falls into.
   * @param {number} separation degrees, [0, 180]
   * @param {object} [orbs] per-aspect maximum deviation in degrees
   * @returns {{name: string, angle: number, deviation: number}|null}
   */
  function classify(separation, orbs) {
    var table = root.SMRC.data.aspects;
    var limits = orbs || config.orbs;
    var best = null;
    for (var i = 0; i < ASPECT_ORDER.length; i++) {
      var name = ASPECT_ORDER[i];
      var angle = table[name].angle;
      var deviation = Math.abs(separation - angle);
      var limit = limits[name];
      if (deviation <= limit && (best === null || deviation < best.deviation)) {
        best = { name: name, angle: angle, deviation: deviation };
      }
    }
    return best;
  }

  function tally(list) {
    var counts = {};
    for (var i = 0; i < list.length; i++) {
      var k = list[i];
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }

  function keysOf(counts) {
    return Object.keys(counts).filter(function (k) {
      return counts[k] > 0;
    });
  }

  function dominant(counts, order) {
    var best = null;
    for (var i = 0; i < order.length; i++) {
      var k = order[i];
      if (!best || (counts[k] || 0) > (counts[best] || 0)) best = k;
    }
    return best;
  }

  /**
   * Full analysis of a Big Three chart.
   * @param {object} chart result of SMRC.chart.compute
   * @returns {object} structured findings
   */
  function analyse(chart) {
    var bodies = chart.bodies;
    var rules = [];
    var pairs = [];

    for (var i = 0; i < PAIRS.length; i++) {
      var p = PAIRS[i];
      var a = bodies[p.a];
      var b = bodies[p.b];
      var separation = M.norm180(a.longitude - b.longitude);
      var aspect = classify(Math.abs(separation));
      if (aspect && Math.abs(separation) <= config.maxRelevantSeparation) {
        pairs.push({
          key: p.key,
          label: root.SMRC.data.pairLabels[p.key],
          a: a,
          b: b,
          separation: Math.abs(separation),
          signedSeparation: separation,
          aspect: aspect,
          strength: 1 - aspect.deviation / (config.orbs[aspect.name] || 1)
        });
        rules.push('aspect-' + p.key + '-' + aspect.name);
        if (b.sign.element !== a.sign.element) {
          var axis = axisOf(a.sign.element, b.sign.element);
          if (axis) rules.push('aspect-' + p.key + '-' + aspect.name + '-axis-' + axis);
        }
      }
    }

    var signList = [bodies.sun, bodies.moon, bodies.rising];
    var elementCounts = tally(signList.map(function (b) { return b.sign.element; }));
    var modalityCounts = tally(signList.map(function (b) { return b.sign.modality; }));
    var polarityCounts = tally(signList.map(function (b) { return b.sign.polarity; }));
    var elementOrder = ['fire', 'earth', 'air', 'water'];
    var elementPresent = keysOf(elementCounts);
    var modalityOrder = ['cardinal', 'fixed', 'mutable'];

    rules.push(elementRules(elementPresent, elementCounts, elementOrder));
    rules.push('modality-' + dominant(modalityCounts, modalityOrder));

    var hot = (elementCounts.fire || 0) + (elementCounts.water || 0);
    rules.push(hot >= 2 ? 'axis-hot' : 'axis-cool');

    if (polarityCounts.yang && polarityCounts.yin) rules.push('polarity-split');
    else if (polarityCounts.yang) rules.push('polarity-yang');
    else rules.push('polarity-yin');

    var distinct = new Set(signList.map(function (b) { return b.signIndex; }));
    if (distinct.size === 1) rules.push('all-three-same');
    else if (distinct.size === 2) rules.push('two-of-a-kind');

    var dispositor = dispositorOf(chart);
    rules.push('dispositor-' + dispositor.location);
    if (dispositor.inOwnSign) rules.push('dispositor-own-sign');
    if (bodies.sun.signIndex === bodies.rising.signIndex) rules.push('rising-equals-sun');
    if (bodies.moon.signIndex === bodies.rising.signIndex) rules.push('rising-equals-moon');
    if (bodies.sun.signIndex === bodies.moon.signIndex && bodies.sun.signIndex !== bodies.rising.signIndex) {
      rules.push('sun-equals-moon');
    }

    var caution = [];
    [bodies.sun, bodies.moon, bodies.rising].forEach(function (body) {
      if (body.cuspMargin < 0.5) caution.push(body);
    });

    return {
      pairs: pairs,
      elements: {
        counts: elementCounts,
        present: elementPresent,
        dominant: dominant(elementCounts, elementOrder),
        missing: elementOrder.filter(function (e) { return !elementCounts[e]; })
      },
      modalities: {
        counts: modalityCounts,
        dominant: dominant(modalityCounts, modalityOrder)
      },
      polarity: polarityCounts,
      dispositor: dispositor,
      caution: caution,
      rules: rules.filter(function (r, idx) { return rules.indexOf(r) === idx; })
    };
  }

  function elementRules(present, counts, order) {
    if (present.length === 4 || present.length === 3) return 'element-balanced';
    if (present.length === 1) return 'element-all-same';
    return 'element-two-same';
  }

  function axisOf(a, b) {
    var key = a + '-' + b;
    var flipped = b + '-' + a;
    if (root.SMRC.data.axes[key]) return key;
    if (root.SMRC.data.axes[flipped]) return flipped;
    return null;
  }

  /**
   * Traditional ruler of the Rising sign, and where that ruler is placed.
   * The dispositor is the planet that decides what the Ascendant sign means,
   * so its house and sign tell you what your outward life is actually about.
   * @param {object} chart
   * @returns {{planet: string, sign: object, location: string, inOwnSign: boolean,
   *            inChart: boolean}} location is 'sun' | 'moon' | 'rising' | 'elsewhere'
   */
  function dispositorOf(chart) {
    var rising = chart.bodies.rising;
    var planet = rising.sign.rulers[0];
    var ruledSign = root.SMRC.zodiac.signsRuledBy(planet)[0];
    var inOwnSign = ruledSign === rising.signIndex;

    if (chart.bodies.sun.signIndex === ruledSign) {
      return {
        planet: planet,
        sign: rising.sign,
        ruledSignIndex: ruledSign,
        location: 'sun',
        inOwnSign: inOwnSign,
        inChart: true
      };
    }
    if (chart.bodies.moon.signIndex === ruledSign) {
      return {
        planet: planet,
        sign: rising.sign,
        ruledSignIndex: ruledSign,
        location: 'moon',
        inOwnSign: inOwnSign,
        inChart: true
      };
    }
    if (chart.bodies.rising.signIndex === ruledSign) {
      return {
        planet: planet,
        sign: rising.sign,
        ruledSignIndex: ruledSign,
        location: 'rising',
        inOwnSign: inOwnSign,
        inChart: true
      };
    }
    return {
      planet: planet,
      sign: rising.sign,
      ruledSignIndex: ruledSign,
      location: 'elsewhere',
      inOwnSign: inOwnSign,
      inChart: false
    };
  }

  root.SMRC.reading = {
    analyse: analyse,
    classify: classify,
    ASPECT_ORDER: ASPECT_ORDER,
    PAIRS: PAIRS
  };
})(typeof window !== 'undefined' ? window : globalThis);
