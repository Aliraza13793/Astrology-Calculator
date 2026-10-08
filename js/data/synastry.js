/* The words for a cross-chart reading. Kept out of core so the analysis stays
   testable and free of prose, and out of the UI so the sentences can be
   reviewed as writing rather than as string concatenation. */
(function (root) {
  'use strict';

  root.SMRC = root.SMRC || {};
  root.SMRC.data = root.SMRC.data || {};

  /* What each body contributes when it reaches across from one chart into
     another. The wording is about the *crossing*, not about the sign, because
     the sign belongs to the person who owns it. */
  var ROLES = {
    sun: {
      label: 'Sun',
      gives: 'their sense of who they are and what they are here to do'
    },
    moon: {
      label: 'Moon',
      gives: 'what they need in order to feel safe'
    },
    venus: {
      label: 'Venus',
      gives: 'how they love, and what they find attractive'
    },
    mars: {
      label: 'Mars',
      gives: 'how they go after what they want'
    },
    rising: {
      label: 'Rising',
      gives: 'the impression they make and the doorway everything arrives through'
    }
  };

  var THEMES = {
    recognition: 'Recognition',
    romance: 'Romance',
    appetite: 'Appetite',
    tenderness: 'Tenderness',
    friction: 'Friction',
    desire: 'Desire',
    meeting: 'Meeting',
    charm: 'Charm',
    'first impression': 'First impression',
    projection: 'Projection'
  };

  var HARMONY_WORDS = {
    flow: 'ease',
    blend: 'fusion',
    friction: 'friction',
    awkward: 'misfiring'
  };

  /**
   * One sentence about a cross aspect, built from the real numbers.
   *
   * The orb decides how firmly the sentence is stated: a conjunction within a
   * degree is described as settled, the same aspect three degrees wide is
   * described as loose. That is the difference the orb is for, and it is why
   * the sentence is generated rather than looked up whole.
   *
   * @param {{from: object, to: object, aspect: object, orb: number,
   *   harmony: string, theme: string}} entry from SMRC.synastry
   * @param {string} nameA first reader's name, may be ''
   * @param {string} nameB second reader's name, may be ''
   * @returns {string}
   */
  function sentence(entry, nameA, nameB) {
    var from = ROLES[entry.from.bodyKey] || { label: entry.from.label, gives: 'themselves' };
    var to = ROLES[entry.to.bodyKey] || { label: entry.to.label, gives: 'themselves' };
    var a = nameA || 'The first person';
    var b = nameB || 'the second';
    var aspect = entry.aspect.name;
    var tight = entry.orb < 1.5;
    var angle = Math.round(entry.separation) + '°';

    var head = a + "'s " + from.label + ' and ' + b + "'s " + to.label
      + ' are in ' + aspect + ', ' + angle + ' apart'
      + (tight ? ', and it is tight' : ', a loose ' + Math.round(entry.orb) + '°')
      + '. ';

    if (entry.harmony === 'flow') {
      return head + 'These two directions do not fight, so '
        + b + ' can meet ' + a + ' where ' + a + ' already is. '
        + 'The risk is that it is easy and therefore never improved on.';
    }
    if (entry.harmony === 'blend') {
      return head + 'The two of them operate as one mechanism, which makes this '
        + 'the loudest thing between you. There is nowhere to put the tension '
        + 'when it turns inward, and strength comes in a single note rather '
        + 'than as a range.';
    }
    if (entry.harmony === 'friction') {
      return head + 'These want genuinely opposite things, and the collision '
        + 'arrives on a regular schedule rather than at random. That is the '
        + 'uncomfortable part and also the part where most of the actual '
        + 'growth happens. Nothing here can be resolved by choosing the right '
        + 'person; it has to be negotiated.';
    }
    return head + 'They share no angle, no element and no modality, so they do '
      + 'not argue. They simply fail to translate. Adjusting here is conscious '
      + 'and slow work rather than something that happens by itself.';
  }

  /**
   * A short summary of what the whole comparison found, phrased so it cannot
   * be mistaken for a score.
   * @param {object} result from SMRC.synastry.between
   * @returns {string}
   */
  function summary(result) {
    if (!result.counts.total) {
      return 'No significant cross aspects fall inside their orbs. That is a '
        + 'real result rather than a failure: the two charts are simply not '
        + 'talking to each other through these points, and the relationship '
        + 'will be shaped by much else.';
    }
    var parts = [];
    if (result.counts.flow) parts.push(result.counts.flow + ' that flow');
    if (result.counts.blend) parts.push(result.counts.blend + ' that blend');
    if (result.counts.friction) parts.push(result.counts.friction + ' that work');
    if (result.counts.awkward) parts.push(result.counts.awkward + ' that misfire');
    return 'Across the Sun, Moon, Venus, Mars and Rising of both charts there '
      + 'are ' + result.counts.total + ' aspects inside their orbs: '
      + parts.join(', ') + '. The count is a description of the geometry, not a '
      + 'verdict, and it says nothing about either person.';
  }

  root.SMRC.data.synastry = {
    ROLES: ROLES,
    THEMES: THEMES,
    HARMONY_WORDS: HARMONY_WORDS,
    sentence: sentence,
    summary: summary
  };
})(typeof window !== 'undefined' ? window : globalThis);
