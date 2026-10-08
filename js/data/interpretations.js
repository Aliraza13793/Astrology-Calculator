/* Prose for the synthesis section, keyed by the rule ids SMRC.reading
   produces. Each entry gets { chart, analysis } and returns { title, body }. */
(function (root) {
  'use strict';

  root.SMRC = root.SMRC || {};
  root.SMRC.data = root.SMRC.data || {};

  var ELEMENT_ORDER = ['fire', 'earth', 'air', 'water'];

  function signsOf(analysis, chart) {
    return [chart.bodies.sun, chart.bodies.moon, chart.bodies.rising];
  }

  function listNames(list) {
    return list.map(function (b) { return b.sign.name; }).join(', ');
  }

  function missingElementText(analysis) {
    var meta = root.SMRC.data.elementMeta;
    return analysis.elements.missing
      .map(function (e) { return meta[e].missing; })
      .join(' ');
  }

  function axisClause(axis) {
    return root.SMRC.data.axes[axis] ? ' That is ' + root.SMRC.data.axes[axis] + '.' : '';
  }

  var interpretations = {
    'element-balanced': {
      title: 'Elementally balanced',
      body: function (ctx) {
        var present = ctx.analysis.elements.present.map(function (e) {
          return root.SMRC.data.elementMeta[e].label;
        });
        return 'Your three signs draw on '
          + present.length === 4
            ? 'all four elements, which almost never happens'
            : 'three different elements'
          + ': '
          + present.join(', ')
          + '. Nothing in your chart is running on empty, which is why you can '
          + 'change gear depending on what a situation needs rather than '
          + 'defaulting to one approach. The trade-off is that you have no '
          + 'automatic strong suit to fall back on when you are tired; you have '
          + 'to choose your element on purpose.';
      }
    },

    'element-two-same': {
      title: 'A doubled element',
      body: function (ctx) {
        var counts = ctx.analysis.elements.counts;
        var dup = ELEMENT_ORDER.filter(function (e) { return counts[e] === 2; })[0];
        var meta = root.SMRC.data.elementMeta;
        if (!dup) return '';
        var pair = signsOf(ctx.analysis, ctx.chart).filter(function (b) {
          return b.sign.element === dup;
        });
        return meta[dup].label
          + ' is doubled: '
          + listNames(pair)
          + '. Whatever '
          + meta[dup].blurb
          + ' means to you, it is running two of your three points at once, so '
          + 'it is the flavour of your whole chart rather than one corner of '
          + 'it. You have a lot of it available and you will be tempted to lean '
          + 'on it by default. '
          + missingElementText(ctx.analysis);
      }
    },

    'element-all-same': {
      title: 'A single element',
      body: function (ctx) {
        var el = ctx.analysis.elements.dominant;
        var meta = root.SMRC.data.elementMeta[el];
        return 'All three of your Big Three signs are '
          + meta.label.toLowerCase()
          + ' signs. Your whole chart is run on '
          + meta.blurb
          + ', which gives you an unusual consistency of direction and almost '
          + 'no natural counterweight. When this is a strength you are '
          + 'unusually good at one kind of thing; when it is not, the same '
          + 'blind spot shows up in your personality, your emotional life and '
          + 'your public manner at the same time. '
          + missingElementText(ctx.analysis);
      }
    },

    'modality-cardinal': {
      title: 'Cardinal emphasis',
      body: function () {
        return root.SMRC.data.modalityMeta.cardinal
          + ' With two cardinal points, you start more than you finish, and '
          + 'opportunities cost you little effort, which is why you often have '
          + 'several things going and not much to show for them.';
      }
    },

    'modality-fixed': {
      title: 'Fixed emphasis',
      body: function () {
        return root.SMRC.data.modalityMeta.fixed
          + ' Fixed points are stubborn and they are what everything else '
          + 'depends on, but two of them will hold you in a situation well '
          + 'past the point where moving would have been the better call.';
      }
    },

    'modality-mutable': {
      title: 'Mutable emphasis',
      body: function () {
        return root.SMRC.data.modalityMeta.mutable
          + ' Two mutable points give you a lot of range and a hard time '
          + 'settling; adaptability is genuinely useful until you notice you '
          + 'have adapted to something you should have left.';
      }
    },

    'axis-hot': {
      title: 'Expressive axis',
      body: function () {
        return 'Two of your three points are fire or water, which is the '
          + 'expressive half of the zodiac. You feel and react first and reason '
          + 'second, which makes you fast, persuasive and occasionally '
          + 'unstoppable, and much harder to live with than to watch. Insulated '
          + 'decisions are your task.';
      }
    },

    'axis-cool': {
      title: 'Controlled axis',
      body: function () {
        return 'Two of your three points are earth or air, the reflective half '
          + 'of the zodiac. You think before you react, which makes you steady '
          + 'company and very hard to rush. The cost is that other people are '
          + 'often in the emotion before you have worked out there is one.';
      }
    },

    'polarity-split': {
      title: 'Yang and yin both loaded',
      body: function () {
        return 'Your chart contains both polarities, so you can initiate and '
          + 'you can receive, and you switch between the two rather than '
          + 'living in one. Mixed polarity usually shows up as being a '
          + 'different person depending on who is in the room.';
      }
    },

    'polarity-yang': {
      title: 'Outgoing bias',
      body: function () {
        return 'All three points are yang signs, so your instinct is to move '
          + 'first, speak first and put yourself into the situation. You are '
          + 'good at starting things and noticeably less good at letting '
          + 'something happen quietly.';
      }
    },

    'polarity-yin': {
      title: 'Receiving bias',
      body: function () {
        return 'All three points are yin signs, so your instinct is to absorb '
          + 'before you act, and to let things come to you. You are good at '
          + 'depth and noticeably less good at announcing yourself.';
      }
    },

    'all-three-same': {
      title: 'One note, played three ways',
      body: function (ctx) {
        var name = ctx.chart.bodies.sun.sign.name;
        return 'Sun, Moon and Rising are all in '
          + name
          + '. That is unusual and it is not three separate influences that '
          + 'happen to agree, it is one disposition expressed in three domains: '
          + 'identity, feeling, and manner. The upside is that you are very easy '
          + 'for people to read. The downside is that you have no internal '
          + 'counterweight, so when the mood goes bad it goes bad in all three '
          + 'at once.';
      }
    },

    'two-of-a-kind': {
      title: 'A doubled sign',
      body: function (ctx) {
        var counts = {};
        var byIndex = {};
        signsOf(ctx.analysis, ctx.chart).forEach(function (b) {
          counts[b.signIndex] = (counts[b.signIndex] || 0) + 1;
          byIndex[b.signIndex] = b.sign;
        });
        var index = Object.keys(counts).filter(function (k) {
          return counts[k] === 2;
        })[0];
        var which = signsOf(ctx.analysis, ctx.chart).filter(function (b) {
          return b.signIndex === index;
        });
        return byIndex[index].name
          + ' takes up two of your three points ('
          + which.map(function (b) { return b.label; }).join(' and ')
          + '). That sign is the main character of your chart: it shows up twice '
          + 'in how you think, how you feel, or both, and it is worth reading '
          + 'twice as carefully as the other two.';
      }
    },

    'dispositor-sun': {
      title: 'Your Rising sign is ruled by your Sun sign',
      body: function (ctx) {
        var d = ctx.analysis.dispositor;
        var rising = ctx.chart.bodies.rising;
        return capitalise(d.planet) + ' rules your '
          + rising.sign.name
          + ' Rising, and your Sun is in '
          + ctx.chart.bodies.sun.sign.name
          + ', which '
          + d.planet
          + ' rules. Your public manner and your core identity are the same '
          + 'impulse in two registers, so people get a consistent read on you '
          + 'and you do not really have a private self that is not on show. The '
          + 'decisions you make for the world are the same decisions you make '
          + 'for yourself.';
      }
    },

    'dispositor-moon': {
      title: 'Your Rising sign is ruled by your Moon sign',
      body: function (ctx) {
        var d = ctx.analysis.dispositor;
        return capitalise(d.planet) + ' rules your '
          + ctx.chart.bodies.rising.sign.name
          + ' Rising, and your Moon is in '
          + ctx.chart.bodies.moon.sign.name
          + '. Your emotional life drives your public manner more than your '
          + 'identity does: how you feel about a situation determines how you '
          + 'come across in it, and people pick that up before they pick up '
          + 'anything else. If you are in a bad mood, the room knows, whatever '
          + 'you intended.';
      }
    },

    'dispositor-rising': {
      title: 'You rule yourself',
      body: function (ctx) {
        return 'The ruler of your '
          + ctx.chart.bodies.rising.sign.name
          + ' Rising sits in '
          + ctx.chart.bodies.rising.sign.name
          + ' itself. Nothing stands between the sign you present and the '
          + 'energy running it, which is why you come across as unusually '
          + 'coherent: there is no gap to read into. It also means there is no '
          + 'external perspective doing your interpreting for you, so you are '
          + 'the last person to notice when you are being too much of one note.';
      }
    },

    'dispositor-elsewhere': {
      title: 'The ruler is elsewhere',
      body: function (ctx) {
        var d = ctx.analysis.dispositor;
        return 'The ruler of your '
          + ctx.chart.bodies.rising.sign.name
          + ' Rising, '
          + capitalise(d.planet)
          + ', is not one of your Big Three, so your outward manner is not '
          + 'decided by your identity or your feelings. Something you do not '
          + 'currently identify with is running how you meet the world, and it '
          + 'tends to show up as circumstances you did not plan rather than as '
          + 'a choice you made.';
      }
    },

    'dispositor-own-sign': {
      title: 'Doubled sign',
      body: function (ctx) {
        return ctx.chart.bodies.rising.sign.name
          + ' is both your Rising sign and the sign that rules it, which puts '
          + 'twice the weight on that part of the chart. Whatever '
          + ctx.chart.bodies.rising.sign.keyword
          + ' means to you, it is not a sideline interest: it is the way you '
          + 'enter a room and the way you run once you are in it.';
      }
    },

    'rising-equals-sun': {
      title: 'Mask and face match',
      body: function (ctx) {
        return 'Your Rising sign is the same as your Sun sign, so what people '
          + 'see when they meet you is genuinely what you consider to be true. '
          + 'This is comfortable and unusually honest, and it does mean you '
          + 'have no protective layer between your interior and your public '
          + 'presentation: the weather report is your mood report.';
      }
    },

    'rising-equals-moon': {
      title: 'Mood on the surface',
      body: function (ctx) {
        return 'Your Rising sign is the same as your Moon sign, so your '
          + 'interior emotional state and your outward manner are the same '
          + 'signal. People read your mood off you instantly, accurately, and '
          + 'whether that is comfortable depends entirely on how you are doing.';
      }
    },

    'sun-equals-moon': {
      title: 'Identity and feeling agree',
      body: function (ctx) {
        var name = ctx.chart.bodies.sun.sign.name;
        return 'Sun and Moon are both in '
          + name
          + ', so what you want and what you feel are not in conflict, which '
          + 'is a real advantage: you do not have to translate between your '
          + 'head and your gut. It can also make you less inclined to examine '
          + 'yourself from the outside, because you have never had to work out '
          + 'which of the two is lying.';
      }
    }
  };

  /* Extra clause appended to a hard aspect whose signs sit across an axis. */
  function axisNote(rule) {
    return rule.indexOf('-axis-') !== -1;
  }

  root.SMRC.data.interpretations = interpretations;
  root.SMRC.data.axisClause = axisClause;
  root.SMRC.data.axisNote = axisNote;

  function capitalise(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
})(typeof window !== 'undefined' ? window : globalThis);
