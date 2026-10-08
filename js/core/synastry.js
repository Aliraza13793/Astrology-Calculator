/* Cross-chart analysis: the aspects between one person's chart and another's.
   No prose, no DOM. Produces the actual aspects found and the rule ids the
   content layer turns into sentences. */
(function (root) {
  'use strict';

  var M = root.SMRC.math;
  var R = root.SMRC.reading;
  var config = root.SMRC.config;

  /* The bodies synastry reads. Jupiter and Saturn are generational and add
     noise rather than information about two particular people, so they are
     not in the set.

     These are *unordered* pairs: an aspect has no direction, so A's Moon
     aspecting B's Sun is the same fact as A's Sun aspecting B's Moon and must
     not be counted twice, but reading only one of the two would make the
     report depend on which person happened to be entered first. Each pair is
     therefore evaluated in both directions and reported under its own key. */
  var PAIRS = [
    { a: 'sun', b: 'moon', theme: 'recognition' },
    { a: 'sun', b: 'venus', theme: 'romance' },
    { a: 'sun', b: 'mars', theme: 'appetite' },
    { a: 'moon', b: 'venus', theme: 'tenderness' },
    { a: 'moon', b: 'mars', theme: 'friction' },
    { a: 'venus', b: 'mars', theme: 'desire' },
    { a: 'rising', b: 'moon', theme: 'meeting' },
    { a: 'rising', b: 'venus', theme: 'charm' },
    { a: 'rising', b: 'mars', theme: 'first impression' },
    { a: 'rising', b: 'sun', theme: 'projection' }
  ];

  var HARMONIES = { flow: 'flow', blend: 'blend', friction: 'friction', awkward: 'awkward' };

  /**
   * Every body of one chart, keyed the same way the pairs refer to them.
   * @param {object} chart result of SMRC.chart.compute
   * @returns {object} key -> placed body
   */
  function bodiesOf(chart) {
    var out = {};
    out.sun = chart.bodies.sun;
    out.moon = chart.bodies.moon;
    out.rising = chart.bodies.rising;
    var extras = chart.planets || {};
    for (var key in extras) {
      if (Object.prototype.hasOwnProperty.call(extras, key)) out[key] = extras[key];
    }
    return out;
  }

  /**
   * Cross aspects between two charts.
   *
   * Deliberately no single compatibility score. Any one number would have to
   * weight a square against a trine by some arbitrary factor, and a reader
   * would take the number as a measurement while the weighting underneath it
   * is a choice, not a result. What the charts actually contain is a list of
   * aspects, and that is what this returns.
   *
   * @param {object} a first chart, computed with the personal planets
   * @param {object} b second chart
   * @returns {{aspects: object[], themes: object, absent: string[]}}
   */
  function between(a, b) {
    var found = [];
    var seen = {};
    var bodiesA = bodiesOf(a);
    var bodiesB = bodiesOf(b);

    for (var i = 0; i < PAIRS.length; i++) {
      var pair = PAIRS[i];
      if (!bodiesA[pair.a] || !bodiesA[pair.b] || !bodiesB[pair.a] || !bodiesB[pair.b]) {
        continue;
      }
      for (var direction = 0; direction < 2; direction += 1) {
        var fromKey = direction === 0 ? pair.a : pair.b;
        var toKey = direction === 0 ? pair.b : pair.a;
        var bodyA = bodiesA[fromKey];
        var bodyB = bodiesB[toKey];
        var key = fromKey + '-' + toKey;

        var separation = Math.abs(M.angleDiff(bodyA.longitude, bodyB.longitude));
        var aspect = R.classify(separation);
        if (!aspect) continue;
        if (separation > config.maxRelevantSeparation) continue;

        found.push({
          key: key,
          theme: pair.theme,
          from: bodyA,
          to: bodyB,
          a: bodyA,
          b: bodyB,
          separation: separation,
          aspect: aspect,
          /* classify() reports the geometry only, so the harmony is read from
             the aspect's own definition rather than invented here. */
          harmony: root.SMRC.data.aspects[aspect.name].harmony,
          orb: aspect.deviation,
          strength: 1 - aspect.deviation / (config.orbs[aspect.name] || 1)
        });
        seen[key] = true;
      }
    }

    /* Both directions of a pair can fall inside their orbs at once when the
     two bodies are close to a sign boundary, so near-duplicates are collapsed
     to the tighter of the two. */
    var deduped = [];
    var bySignature = {};
    for (var k = 0; k < found.length; k++) {
      var e = found[k];
      var signature = e.a.label + '|' + e.b.label + '|' + e.aspect.name;
      var existing = bySignature[signature];
      if (existing) {
        if (e.orb < existing.orb) {
          deduped[deduped.indexOf(existing)] = e;
          bySignature[signature] = e;
        }
        continue;
      }
      bySignature[signature] = e;
      deduped.push(e);
    }

    deduped.sort(function (x, y) { return y.strength - x.strength; });

    var themes = {};
    for (var t = 0; t < deduped.length; t++) {
      var name = deduped[t].theme;
      if (!themes[name]) themes[name] = { total: 0, flow: 0, friction: 0, awkward: 0, blend: 0 };
      themes[name].total += deduped[t].strength;
      themes[name][deduped[t].harmony] += deduped[t].strength;
    }

    var absent = [];
    for (var p = 0; p < PAIRS.length; p++) {
      for (var d = 0; d < 2; d += 1) {
        var key = d === 0 ? PAIRS[p].a + '-' + PAIRS[p].b : PAIRS[p].b + '-' + PAIRS[p].a;
        if (!seen[key]) absent.push(key);
      }
    }

    return {
      aspects: deduped,
      themes: themes,
      absent: absent,
      counts: {
        total: deduped.length,
        flow: countHarmony(deduped, HARMONIES.flow),
        friction: countHarmony(deduped, HARMONIES.friction),
        awkward: countHarmony(deduped, HARMONIES.awkward),
        blend: countHarmony(deduped, HARMONIES.blend)
      }
    };
  }

  function countHarmony(list, harmony) {
    var n = 0;
    for (var i = 0; i < list.length; i++) if (list[i].harmony === harmony) n += 1;
    return n;
  }

  /**
   * The strongest aspects on each side, which is what a reading leads with.
   * @param {{aspects: object[]}} result of between
   * @param {number} [limit]
   * @returns {object[]}
   */
  function highlights(result, limit) {
    return result.aspects.slice(0, limit || 3);
  }

  root.SMRC.synastry = {
    between: between,
    highlights: highlights,
    bodiesOf: bodiesOf,
    PAIRS: PAIRS
  };
})(typeof window !== 'undefined' ? window : globalThis);
