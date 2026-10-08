/* Bootstrap for the event calendar. All the finding is done in
   SMRC.events; this file chooses a year, filters, and renders the timeline. */
(function (root) {
  'use strict';

  var h = root.SMRC.ui.dom.h;
  var config = root.SMRC.config;

  var KINDS = [
    { id: 'f-solar', kind: 'solar', label: 'Seasons' },
    { id: 'f-phase', kind: 'phase', label: 'Moon phases' },
    { id: 'f-ingress', kind: 'ingress', label: 'Moon sign changes' },
    { id: 'f-station', kind: 'station', label: 'Retrogrades' }
  ];

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  /* The date is formatted in the reader's own timezone, which is the only
     honest choice: an equinox is one instant but it happens at a different
     clock time in every city. */
  function localParts(jd) {
    var date = new Date((jd - 2440587.5) * 86400000);
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      hours: date.getHours(),
      minutes: date.getMinutes(),
      weekday: date.getDay()
    };
  }

  function timeLabel(jd) {
    var p = localParts(jd);
    return p.hours + ':' + (p.minutes < 10 ? '0' : '') + p.minutes;
  }

  function monthLabel(jd) {
    return MONTHS[localParts(jd).month];
  }

  function zoneLabel() {
    try {
      var resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return resolved || 'your local time';
    } catch (error) {
      return 'your local time';
    }
  }

  function eventRow(entry) {
    var when = h('div', { class: 'cal-when' }, [
      h('span', { class: 'cal-date', text: localParts(entry.jd).day + ' ' + monthLabel(entry.jd) }),
      h('span', { class: 'cal-time', text: timeLabel(entry.jd) })
    ]);
    return h('li', { class: 'cal-row', 'data-kind': entry.kind }, [
      when,
      h('div', { class: 'cal-what' }, [
        h('span', { class: 'cal-title', text: entry.title }),
        entry.detail ? h('span', { class: 'cal-detail', text: entry.detail }) : null
      ])
    ]);
  }

  function groupByMonth(entries) {
    var groups = [];
    var current = null;
    for (var i = 0; i < entries.length; i++) {
      var parts = localParts(entries[i].jd);
      if (!current || current.month !== parts.month) {
        current = { month: parts.month, year: parts.year, rows: [] };
        groups.push(current);
      }
      current.rows.push(entries[i]);
    }
    return groups;
  }

  function findNewMoon(data) {
    for (var i = 0; i < data.length; i += 1) {
      if (data[i].phase === 'New Moon') return data[i].jd;
    }
    return null;
  }

  function findFullMoon(data) {
    for (var i = 0; i < data.length; i += 1) {
      if (data[i].phase === 'Full Moon') return data[i].jd;
    }
    return null;
  }

  function note(h2, data) {
    var newMoon = findNewMoon(data.moonPhases);
    var fullMoon = findFullMoon(data.moonPhases);
    return h('div', { class: 'callout', 'data-tone': 'note' }, [
      h('h3', { text: h2 }),
      h('p', {
        text: data.moonPhases.length + ' new and full Moons this year. First new moon '
          + (newMoon === null ? 'not found' : shortDate(newMoon))
          + ', first full moon '
          + (fullMoon === null ? 'not found' : shortDate(fullMoon))
          + '. The Moon changes sign '
          + data.moonSignChanges.length + ' times, and there are '
          + data.stations.length + ' planetary stations.'
      })
    ]);
  }

  function shortDate(jd) {
    var p = localParts(jd);
    return p.day + ' ' + MONTHS[p.month].slice(0, 3) + ' at ' + timeLabel(jd);
  }

  function render(target, data, filters) {
    target.textContent = '';
    var shown = data.all.filter(function (entry) { return filters[entry.kind]; });

    target.appendChild(h('h2', { id: 'results-title', text: 'The astrology year ' + data.year }));
    target.appendChild(h('p', { class: 'cal-zone', text: 'All times are in ' + zoneLabel() + '.' }));
    target.appendChild(note('At a glance', data));

    if (!shown.length) {
      target.appendChild(h('div', { class: 'callout', 'data-tone': 'note' }, [
        h('h3', { text: 'Nothing selected' }),
        h('p', { text: 'Every kind of event is switched off. Turn at least one back on to see the year.' })
      ]));
    }

    var groups = groupByMonth(shown);
    groups.forEach(function (group) {
      var list = h('ul', { class: 'cal-list' });
      group.rows.forEach(function (entry) { list.appendChild(eventRow(entry)); });
      target.appendChild(h('section', { class: 'cal-month' }, [
        h('h3', { text: MONTHS[group.month] + ' ' + group.year }),
        list
      ]));
    });

    target.appendChild(h('div', { class: 'results-actions' }, [
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

  ready(function () {
    var results = document.getElementById('results');
    var submit = document.getElementById('submit');
    var yearInput = document.getElementById('year');
    var errorBox = document.getElementById('year-error');

    function readFilters() {
      var filters = {};
      KINDS.forEach(function (entry) {
        var input = document.getElementById(entry.id);
        filters[entry.kind] = input ? input.checked : true;
      });
      return filters;
    }

    function run() {
      var value = Number(yearInput.value);
      errorBox.textContent = '';
      yearInput.removeAttribute('aria-invalid');
      if (!yearInput.value.trim() || !Number.isInteger(value)) {
        errorBox.textContent = 'Enter a whole year, for example 2026.';
        yearInput.setAttribute('aria-invalid', 'true');
        yearInput.focus();
        return;
      }
      if (value < config.yearRange.min || value > config.yearRange.max) {
        errorBox.textContent = 'Enter a year between '
          + config.yearRange.min + ' and ' + config.yearRange.max + '.';
        yearInput.setAttribute('aria-invalid', 'true');
        yearInput.focus();
        return;
      }

      var data;
      try {
        data = root.SMRC.events.year(value);
      } catch (error) {
        errorBox.textContent = 'That year could not be worked out. Try another.';
        return;
      }
      render(results, data, readFilters());
    }

    root.SMRC.ui.calendar = {
      show: run
    };

    document.getElementById('year-form').addEventListener('submit', function (event) {
      event.preventDefault();
      submit.disabled = true;
      submit.textContent = 'Working\u2026';
      try {
        run();
      } finally {
        submit.disabled = false;
        submit.textContent = 'Show the year';
      }
    });

    /* Switching a category on or off re-renders what is already calculated,
       so the reader does not have to press the button again. */
    KINDS.forEach(function (entry) {
      var input = document.getElementById(entry.id);
      if (input) input.addEventListener('change', run);
    });

    run();
  });
})(typeof window !== 'undefined' ? window : globalThis);
