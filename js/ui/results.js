/* Result rendering. Presentation only: every number here comes from the chart
   object and every sentence from the content layer. */
(function (root) {
  'use strict';

  var ELEMENT_COLOUR = {
    fire: 'var(--fire)',
    earth: 'var(--earth)',
    air: 'var(--air)',
    water: 'var(--water)'
  };

  /* Shared with the other tools' renderers, so one page cannot end up with a
     subtly different idea of how an element is built. */
  var h = root.SMRC.ui.dom.h;

  function signCard(body, slot, descriptionKey) {
    var sign = body.sign;
    var tags = [
      h('li', { class: 'tag', 'data-kind': sign.element, text: sign.element }),
      h('li', { class: 'tag', text: sign.modality }),
      h('li', { class: 'tag', text: sign.polarity === 'yang' ? 'outgoing' : 'incoming' }),
      h('li', { class: 'tag', text: 'house ' + body.house })
    ];

    return h('article', {
      class: 'sign-card',
      'data-slot': slot,
      style: '--accent:' + ELEMENT_COLOUR[sign.element]
    }, [
      h('p', { class: 'sign-slot', text: slot }),
      h('div', { class: 'sign-card-top' }, [
        h('span', { class: 'sign-glyph', 'aria-hidden': 'true', text: sign.symbol }),
        h('h3', { class: 'sign-name', text: sign.name })
      ]),
      h('p', { class: 'sign-degree', text: body.degreeText + ' \u00B7 ' + sign.dateRange }),
      h('ul', { class: 'tag-row' }, tags),
      h('p', { text: sign[descriptionKey] }),
      h('p', { class: 'sign-traits' }, [
        h('strong', { text: 'At its best: ' }),
        sign.strengths
      ]),
      h('p', { class: 'sign-traits' }, [
        h('strong', { text: 'The cost: ' }),
        sign.challenges
      ])
    ]);
  }

  function callout(title, bodyNodes, tone) {
    return h('div', { class: 'callout', 'data-tone': tone || 'note' }, [
      h('h3', { text: title })
    ].concat(bodyNodes));
  }

  function paragraphs(text) {
    return String(text)
      .split(/\n{2,}/)
      .map(function (p) { return h('p', { text: p.trim() }); });
  }

  function balanceTable(counts, order, labels) {
    return h('ul', { class: 'balance' }, order.map(function (key) {
      return h('li', {}, [
        h('span', { class: 'count', text: String(counts[key] || 0) }),
        h('span', { class: 'what', text: labels[key] })
      ]);
    }));
  }

  function dataRow(body) {
    return [
      body.sign.name,
      body.degreeText,
      String(body.house),
      body.sign.element,
      body.sign.modality,
      capitalise(body.sign.rulers[0])
    ];
  }

  function capitalise(text) {
    return String(text).charAt(0).toUpperCase() + String(text).slice(1);
  }

  function table(headers, rows, caption) {
    return h('div', { class: 'table-scroll' }, [
      h('table', { class: 'data-table' }, [
        h('caption', { text: caption }),
        h('thead', {}, [h('tr', {}, headers.map(function (x) { return h('th', { text: x }); }))]),
        h('tbody', {}, rows.map(function (row) {
          return h('tr', {}, row.map(function (cell) { return h('td', { text: cell }); }));
        }))
      ])
    ]);
  }

  /**
   * Build the results region.
   *
   * @param {object} chart from SMRC.chart.compute
   * @param {object} analysis from SMRC.reading.analyse
   * @param {{name?: string, unknownTime?: boolean}} options
   * @returns {DocumentFragment}
   */
  function build(chart, analysis, options) {
    var opts = options || {};
    var frag = document.createDocumentFragment();
    var bodies = chart.bodies;

    frag.appendChild(h('div', { class: 'results-head' }, [
      h('div', {}, [
        h('h2', { id: 'results-title', text: opts.name ? opts.name + ', your Big Three' : 'Your Big Three' }),
        h('p', { class: 'results-meta', text: metaLine(chart, opts.unknownTime) })
      ])
    ]));

    frag.appendChild(callout('Before you read this', [
      h('p', {
        text: 'These are three points in the sky at one moment, described in the '
          + 'traditional language of astrology. It is a framework for thinking about '
          + 'yourself, not a forecast, and it will be more useful if you read the parts '
          + 'that feel wrong as carefully as the parts that feel right.'
      })
    ]));

    /* Every caveat sits together, before any interpretation, so a warning is
       never separated from the result it applies to. */
    var cautions = cautionsFor(chart);
    if (cautions.length) {
      frag.appendChild(h('div', { class: 'findings-stack' }, cautions));
    }

    frag.appendChild(h('div', { class: 'sign-grid' }, [
      signCard(bodies.sun, 'Sun', 'sun'),
      signCard(bodies.moon, 'Moon', 'moon'),
      signCard(bodies.rising, 'Rising', 'rising')
    ]));

    frag.appendChild(h('section', { class: 'section' }, [
      h('h2', { text: 'How your three work together' }),
      aspectsBlock(chart, analysis),
      findingsBlock(chart, analysis) || h('div'),
      balanceBlock(analysis)
    ]));

    frag.appendChild(h('section', { class: 'section' }, [
      h('h2', { text: 'Your chart at a glance' }),
      table(
        ['Point', 'Position', 'House', 'Element', 'Mode', 'Ruler'],
        [
          ['Sun'].concat(dataRow(bodies.sun)),
          ['Moon'].concat(dataRow(bodies.moon)),
          ['Rising (Ascendant)'].concat(dataRow(bodies.rising)),
          ['Midheaven (MC)'].concat(dataRow(chart.mc))
        ],
        'Positions are apparent geocentric ecliptic longitude of date.'
      ),
      h('p', { class: 'results-meta', text: moonLine(chart) }),
      h('p', { class: 'results-meta' }, [
        'Houses are ',
        chart.houses.system,
        ': each cusp is a whole sign from your Ascendant, so the Midheaven sits inside '
          + 'the tenth house rather than on its cusp. See the method note below.'
      ])
    ]));

    frag.appendChild(h('section', { class: 'section method' }, [
      h('h2', { text: 'What went into this' }),
      h('p', { text: 'Your local time of '
        + chart.moment.localTimeLabel
        + ' on '
        + chart.moment.utcLabel.slice(0, 10)
        + ' was converted using the daylight saving rules in force in '
        + chart.moment.timezone
        + ' at that date ('
        + chart.moment.utcOffsetLabel
        + ' from UTC). Positions come from the standard published series for the Sun '
        + 'and the Moon, and the Ascendant from the horizon at your coordinates.' }),
      h('p', { text: chart.limits.note })
    ]));

    return frag;
  }

  function metaLine(chart, unknownTime) {
    var parts = [
      chart.input.placeName || chart.moment.timezone,
      chart.moment.utcLabel.slice(0, 10)
    ];
    if (unknownTime && chart.solarNoon) {
      parts.push('birth time unknown, so local solar noon (' + chart.solarNoon.localLabel + ') was used');
    } else {
      parts.push('born at ' + chart.moment.localTimeLabel);
    }
    return parts.join(' \u00B7 ');
  }

  function moonLine(chart) {
    return 'The Moon was '
      + chart.moon.phaseName.toLowerCase()
      + ', '
      + Math.round(chart.moon.illumination * 100)
      + '% illuminated, about '
      + Math.round(chart.moon.age)
      + ' days into the cycle, and '
      + Math.round(chart.moon.distance).toLocaleString('en-GB')
      + ' km away. The Sun was '
      + Math.round(chart.sun.distance).toLocaleString('en-GB')
      + ' km away.';
  }

  function cautionsFor(chart) {
    var out = [];
    var u = chart.uncertainty;

    if (u.timeUnknown) {
      var noon = chart.solarNoon;
      var minutes = noon ? Math.abs(noon.minutesFromClockNoon) : 0;
      out.push(callout('Your Rising sign cannot be worked out', [
        h('p', {
          text: 'Without a birth time the Ascendant is not a detail you can look up, it '
            + 'is an unknown: it moves roughly fifteen degrees an hour, so two hours of '
            + 'uncertainty spans most of a sign. Everything else on this page is sound.'
        }),
        h('p', {
          text: 'Your Sun and Moon above were calculated for local solar noon'
            + (noon
              ? ', which on your date in ' + chart.input.placeName + ' fell at '
                + noon.localLabel + ' on the clock, '
                + minutes + ' minutes from midday'
              : '')
            + '. That is the moment your chart changes least, so it is the safest single '
            + 'guess available. The Moon needs about an hour and a half of error to change '
            + 'sign, so treat the Moon sign as reliable and the Rising sign as unknown.'
        })
      ], 'warn'));
    }

    if (chart.moment.ambiguousLocalTime) {
      out.push(callout('That local time happened twice', [
        h('p', {
          text: 'The clocks went back that night, so the time you entered occurred twice. '
            + 'This reading uses the earlier of the two, one hour ahead in summer time. If '
            + 'your birth certificate shows the later time, change it by an hour and the '
            + 'Rising sign may well move.'
        })
      ], 'warn'));
    }

    if (chart.moment.nonexistentLocalTime) {
      out.push(callout('That local time never happened', [
        h('p', {
          text: 'The clocks jumped forward over that hour, so the time you entered did not '
            + 'exist in your city on that date. This reading uses the first real moment '
            + 'after the jump, which is the closest a birth can be to it.'
        })
      ], 'warn'));
    }

    if (chart.cautionBodies && chart.cautionBodies.length) {
      out.push(callout('Close to a sign boundary', [
        h('p', {
          text: chart.cautionBodies.map(function (b) {
            return b.label + ' is only ' + b.cuspMargin.toFixed(2) + '\u00B0 from changing sign';
          }).join(', ') + '. A birth time off by as little as '
            + Math.max(1, Math.round(1 / root.SMRC.chart.ASC_PER_MINUTE))
            + ' minutes could move it into the next sign.'
        })
      ], 'warn'));
    }

    return out;
  }

  function aspectsBlock(chart, analysis) {
    var aspects = root.SMRC.data.aspects;
    if (!analysis.pairs.length) {
      return h('p', {
        class: 'results-meta',
        text: 'None of your three points sit at a classic angle to each other, which is '
          + 'uncommon and means none of the usual short tensions apply. They still have to '
          + 'live in the same person, which is where the next section starts.'
      });
    }
    return h('ul', { class: 'aspect-list' }, analysis.pairs.map(function (pair) {
      var spec = aspects[pair.aspect.name];
      return h('li', { class: 'aspect' }, [
        h('h3', {}, [
          h('span', { 'aria-hidden': 'true', text: spec.symbol }),
          pair.a.sign.name + ' and ' + pair.b.sign.name + ' \u00B7 ' + spec.name,
          h('small', {
            class: 'results-meta',
            text: ' exactly ' + pair.aspect.deviation.toFixed(1) + '\u00B0 from the perfect angle'
          })
        ]),
        h('p', { text: spec.describe(pair.a.sign, pair.b.sign) })
      ]);
    }));
  }

  function findingsBlock(chart, analysis) {
    var library = root.SMRC.data.interpretations;
    var seen = {};
    var items = [];
    analysis.rules.forEach(function (rule) {
      if (rule.indexOf('aspect-') === 0) return;
      if (seen[rule]) return;
      seen[rule] = true;
      var entry = library[rule];
      if (!entry) return;
      items.push(h('div', { class: 'finding-item' }, [
        h('h3', { text: entry.title }),
        h('p', { text: entry.body({ chart: chart, analysis: analysis }) })
      ]));
    });
    if (!items.length) return null;
    return h('div', { class: 'finding' }, items);
  }

  function balanceBlock(analysis) {
    var elementMeta = root.SMRC.data.elementMeta;
    var present = analysis.elements.present;
    return h('div', { class: 'section' }, [
      h('h3', { text: 'The balance of your three' }),
      balanceTable(analysis.elements.counts,
        ['fire', 'earth', 'air', 'water'],
        { fire: 'fire', earth: 'earth', air: 'air', water: 'water' }),
      h('p', { class: 'results-meta', text: present.map(function (e) {
        return elementMeta[e].label + ' (' + elementMeta[e].blurb + ')';
      }).join(' \u00B7 ') }),
      balanceTable(analysis.modalities.counts,
        ['cardinal', 'fixed', 'mutable'],
        { cardinal: 'cardinal', fixed: 'fixed', mutable: 'mutable' })
    ]);
  }

  /**
   * Replace the contents of the results region.
   * @param {HTMLElement} container
   * @param {object} chart
   * @param {object} analysis
   * @param {object} options
   * @returns {HTMLElement} the container
   */
  function render(container, chart, analysis, options) {
    container.textContent = '';
    /* The cusp proximity list is used by the callouts, so it is attached here
       rather than computed twice. */
    var withCautions = Object.assign({}, chart, {
      cautionBodies: analysis.caution
    });
    container.appendChild(build(withCautions, analysis, options));
    container.hidden = false;
    return container;
  }

  root.SMRC = root.SMRC || {};
  root.SMRC.ui = root.SMRC.ui || {};
  root.SMRC.ui.results = {
    build: build,
    render: render,
    h: h
  };
})(typeof window !== 'undefined' ? window : globalThis);
