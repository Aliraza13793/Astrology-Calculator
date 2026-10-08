/* Aspect definitions and the prose that goes with them.
   These are aspects between the three Big Three points only, not a full
   chart aspect list. */
(function (root) {
  'use strict';

  root.SMRC = root.SMRC || {};
  root.SMRC.data = root.SMRC.data || {};

  function both(a, b) {
    return a.name + ' and ' + b.name;
  }

  root.SMRC.data.aspects = {
    conjunction: {
      name: 'conjunction',
      angle: 0,
      symbol: '\u25A0',
      harmony: 'blend',
      describe: function (a, b) {
        if (a === b) {
          return 'Your Sun and your Moon are both in '
            + a.name
            + '. One tank, one direction: whatever '
            + a.keyword
            + ' means to you, you feel it and you act on it at the same time. '
            + 'That makes this the loudest theme in your chart, and it leaves '
            + 'you nowhere to put the tension when it turns inward. In a '
            + 'single note you get depth rather than range.';
        }
        return 'A close conjunction across '
          + both(a, b)
          + '. These are neighbouring signs, so the two of you want nearly the '
          + 'same thing and reinforce each other quickly. Watch for '
          + a.short.toLowerCase()
          + ' and '
          + b.short.toLowerCase()
          + ' showing up as one behaviour rather than two.';
      }
    },

    sextile: {
      name: 'sextile',
      angle: 60,
      symbol: '\u2736',
      harmony: 'flow',
      describe: function (a, b) {
        return both(a, b)
          + ' talk to each other easily. Your '
          + a.keyword
          + ' and your '
          + b.keyword
          + ' are compatible enough that you can act on what you feel without '
          + 'a fight first. The risk here is not friction, it is comfort: when '
          + 'it flows you never have to stretch, and the easy version of you '
          + 'is not the interesting one.';
      }
    },

    square: {
      name: 'square',
      angle: 90,
      symbol: '\u25A1',
      harmony: 'friction',
      describe: function (a, b) {
        return 'Both '
          + a.modality
          + ' signs, '
          + both(a, b)
          + ', but '
          + a.element
          + ' against '
          + b.element
          + '. Your '
          + a.keyword
          + ' and your '
          + b.keyword
          + ' pull in genuinely opposite directions and you will feel the '
          + 'collision on a regular schedule. This is the productive friction '
          + 'of your chart: uncomfortable, and where most of your actual '
          + 'growth happens.';
      }
    },

    trine: {
      name: 'trine',
      angle: 120,
      symbol: '\u25C7',
      harmony: 'flow',
      describe: function (a, b) {
        return 'Two '
          + a.element
          + ' signs, '
          + both(a, b)
          + '. Your identity and your feelings want the same thing, so this is '
          + 'the easy part of the chart to live in. It is also where you are '
          + 'most likely to coast: a gift nobody pushes on stays the size it '
          + 'was when you were born.';
      }
    },

    opposition: {
      name: 'opposition',
      angle: 180,
      symbol: '\u25D0',
      harmony: 'friction',
      describe: function (a, b) {
        return both(a, b)
          + ' sit on opposite ends of the same axis. These are the same '
          + 'instinct aimed in two directions, so you tend to swing between '
          + 'them rather than splitting the difference, and whichever end you '
          + 'are not living tends to show up through the people closest to '
          + 'you. Polarities differ here, which is why the pull is so strong '
          + 'and so hard to see while you are inside it.';
      }
    },

    quincunx: {
      name: 'quincunx',
      angle: 150,
      symbol: '\u26AD',
      harmony: 'awkward',
      describe: function (a, b) {
        return both(a, b)
          + ' share nothing: different element, different modality, no real '
          + 'angle between them. These two do not argue with each other, they '
          + 'just fail to translate. Adjusting here is conscious, slow work '
          + 'rather than something that happens by itself.';
      }
    }
  };

  /* The two elemental poles. Used to explain what a hard aspect is arguing
     about when the two signs sit across these axes. */
  root.SMRC.data.axes = {
    'fire-water': 'drive against feeling',
    'earth-air': 'the thing against the idea of the thing'
  };

  root.SMRC.data.pairLabels = {
    'sun-moon': 'your identity against your feelings',
    'sun-rising': 'who you are against how you handle a room',
    'moon-rising': 'what you feel against how you handle a room'
  };
})(typeof window !== 'undefined' ? window : globalThis);
