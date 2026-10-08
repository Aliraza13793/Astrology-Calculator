/* Bootstrap for the two person comparison page. Wiring and rendering only:
   every position comes from SMRC.chart, every aspect from SMRC.synastry, and
   every sentence from the content layer. */
(function (root) {
  'use strict';

  var h = root.SMRC.ui.dom.h;
  var form = root.SMRC.ui.form;

  var PEOPLE = [
    { prefix: 'a', label: 'First person' },
    { prefix: 'b', label: 'Second person' }
  ];

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function signChip(body) {
    return h('li', { class: 'tag', 'data-kind': body.sign.element, text: body.sign.name });
  }

  function bodyList(bodies) {
    return h('ul', { class: 'tag-row' }, bodies.map(signChip));
  }

  /* The orb is a fraction of a degree, so it is reported in the unit that
     actually fits: arcseconds when it is very tight, arcminutes when it is
     within a couple of degrees, and degrees beyond that. Labelling all three
     with a degree sign would overstate a tight orb by a factor of sixty. */
  function orbText(aspect) {
    var deg = aspect.orb;
    if (deg * 3600 < 60) {
      return Math.max(1, Math.round(deg * 3600)) + ' arcsec off exact';
    }
    if (deg < 2) {
      return Math.round(deg * 60) + '′ off exact';
    }
    return deg.toFixed(1) + '° off exact';
  }

  function aspectCard(entry, nameA, nameB) {
    var content = root.SMRC.data.synastry;
    var harmony = entry.harmony;
    return h('article', { class: 'aspect-card', 'data-harmony': harmony }, [
      h('p', { class: 'sign-slot', text: content.THEMES[entry.theme] || entry.theme }),
      h('div', { class: 'sign-card-top' }, [
        h('h3', {
          class: 'sign-name',
          /* classify() reports the geometry only, so the glyph comes from the
             aspect's own definition. */
          text: entry.from.label + ' ' + root.SMRC.data.aspects[entry.aspect.name].symbol
            + ' ' + entry.to.label
        }),
        h('span', { class: 'tag', text: entry.aspect.name })
      ]),
      h('p', {
        class: 'sign-degree',
        text: entry.from.degreeText + ' ' + entry.from.sign.name
          + ' \u00B7 ' + entry.to.degreeText + ' ' + entry.to.sign.name
      }),
      h('p', { class: 'aspect-orb', text: orbText(entry) }),
      h('p', { text: content.sentence(entry, nameA, nameB) })
    ]);
  }

  function chartSummary(bodies, name) {
    return h('section', { class: 'pair-side' }, [
      h('h3', { text: name }),
      h('ul', { class: 'pair-bodies' }, Object.keys(bodies).map(function (key) {
        var b = bodies[key];
        if (!b) return null;
        return h('li', {}, [
          h('span', { class: 'pair-body-name', text: b.label }),
          h('span', { class: 'pair-body-place', text: b.degreeText + ' ' + b.sign.name }),
          b.retrograde ? h('span', { class: 'tag', text: 'retrograde' }) : null
        ]);
      }))
    ]);
  }

  function callout(title, lines, tone) {
    return h('div', { class: 'callout', 'data-tone': tone || 'note' }, [
      h('h3', { text: title })
    ].concat(lines.map(function (line) { return h('p', { text: line }); })));
  }

  function render(target, comparison) {
    var content = root.SMRC.data.synastry;
    target.textContent = '';
    var nameA = comparison.nameA;
    var nameB = comparison.nameB;
    var first = nameA || 'The first person';
    var second = nameB || 'the second';

    target.appendChild(h('h2', { id: 'results-title', text: first + ' and ' + second }));

    if (comparison.omitted.length) {
      target.appendChild(callout('Left out of this comparison', [
        'No Ascendant is shown for ' + comparison.omitted.join(' or ')
          + ', because that birth time is not known. The Ascendant depends on the'
          + ' clock rather than the calendar, so it cannot be worked out from a'
          + ' date and is not guessed at noon. Everything below uses the Sun, Moon,'
          + ' Venus and Mars, which need only the date, and it is the Moon and Venus'
          + ' that carry most of a relationship reading anyway.'
      ], 'warn'));
    }

    target.appendChild(h('div', { class: 'pair-charts' }, [
      chartSummary(comparison.bodiesA, first),
      chartSummary(comparison.bodiesB, second)
    ]));

    target.appendChild(callout('What the charts share', [
      content.summary(comparison.synastry)
    ]));

    var counts = comparison.synastry.counts;
    target.appendChild(h('p', { class: 'result-counts', text:
      counts.flow + ' aspect' + (counts.flow === 1 ? '' : 's') + ' that flow, '
      + counts.blend + ' that blend, '
      + counts.friction + ' that work, and '
      + counts.awkward + ' that misfire. '
    }));

    if (!comparison.synastry.aspects.length) {
      target.appendChild(callout('Nothing in common', [
        'Not one of these pairings falls inside its orb. That is a real answer,'
        + ' not a failure, and it usually means the connection is carried by'
        + ' something this page does not measure.'
      ], 'note'));
    } else {
      target.appendChild(h('h3', { class: 'subhead', text: 'The aspects, tightest first' }));
      var cards = h('div', { class: 'aspect-grid' });
      comparison.synastry.aspects.forEach(function (entry) {
        cards.appendChild(aspectCard(entry, nameA, nameB));
      });
      target.appendChild(cards);
    }

    target.appendChild(h('div', { class: 'results-actions' }, [
      h('button', {
        type: 'button',
        class: 'btn btn-secondary',
        text: 'Start over',
        onclick: function () {
          document.getElementById('pair-form').reset();
          cities.forEach(function (c) { c.clear(); });
          target.hidden = true;
          document.getElementById('a-date').focus();
        }
      }),
      h('button', {
        type: 'button',
        class: 'btn btn-secondary',
        text: 'Print or save as PDF',
        onclick: function () { window.print(); }
      }),
      h('a', { class: 'btn btn-secondary', href: '#method', text: 'How this is calculated' })
    ]));

    target.hidden = false;
  }

  var cities = [];

  ready(function () {
    var results = document.getElementById('results');
    var submit = document.getElementById('submit');

    form.initTimeToggle('a');
    form.initTimeToggle('b');
    cities = PEOPLE.map(function (person) {
      return form.initCity({ prefix: person.prefix });
    });

    root.SMRC.ui.love = {
      cities: cities,
      calculate: run
    };

    function run() {
      var outcomes = PEOPLE.map(function (person, index) {
        return form.read(cities[index].getPlace(), person.prefix);
      });

      var bad = outcomes.filter(function (o) { return !o.ok; })[0];
      if (bad) {
        var node = document.getElementById(bad.field);
        if (node) node.focus();
        return;
      }

      var chartA;
      var chartB;
      var synastry;
      try {
        chartA = root.SMRC.chart.compute(outcomes[0].birth, { planets: ['venus', 'mars'] });
        chartB = root.SMRC.chart.compute(outcomes[1].birth, { planets: ['venus', 'mars'] });
        synastry = root.SMRC.synastry.between(chartA, chartB);
      } catch (error) {
        submit.disabled = false;
        submit.textContent = 'Compare the two charts';
        form.setError('a-city', 'Something went wrong calculating that. Try a nearby city name.');
        return;
      }

      var nameA = document.getElementById('a-name').value.trim();
      var nameB = document.getElementById('b-name').value.trim();
      var omitted = [];
      if (outcomes[0].unknownTime) omitted.push(nameA || 'the first person');
      if (outcomes[1].unknownTime) omitted.push(nameB || 'the second person');

      render(results, {
        nameA: nameA,
        nameB: nameB,
        omitted: omitted,
        bodiesA: root.SMRC.synastry.bodiesOf(chartA),
        bodiesB: root.SMRC.synastry.bodiesOf(chartB),
        synastry: synastry
      });

      submit.disabled = false;
      submit.textContent = 'Compare the two charts';
      results.scrollIntoView({ behavior: 'auto', block: 'start' });
    }

    document.getElementById('pair-form').addEventListener('submit', function (event) {
      event.preventDefault();
      submit.disabled = true;
      submit.textContent = 'Reading\u2026';
      try {
        run();
      } finally {
        submit.disabled = false;
        submit.textContent = 'Compare the two charts';
      }
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
