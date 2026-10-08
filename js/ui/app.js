/* Bootstrap: wire the form, run the calculation, show the reveal and the
   results, and remember the last search locally. */
(function (root) {
  'use strict';

  var storage = root.SMRC.storage;
  var config = root.SMRC.config;

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var form = document.getElementById('birth-form');
    var results = document.getElementById('results');
    var submit = document.getElementById('submit');
    var city = root.SMRC.ui.form.initCity();
    var lastName = '';

    /* Exposed so the page can drive or inspect the form from anywhere: a
       "recalculate" control, or a test, uses the same controller the submit
       button does rather than a second one with its own state. */
    root.SMRC.ui.app = {
      city: city,
      calculate: function () { run(); }
    };

    root.SMRC.ui.form.initTimeToggle();

    function saveLast(birth) {
      /* No name is stored, ever. The place and the moment are enough to put
         the form back the way the user left it. */
      storage.set(config.storage.savedKey, {
        label: birth.placeName,
        latitude: birth.latitude,
        longitude: birth.longitude,
        timezone: birth.timezone,
        year: birth.year,
        month: birth.month,
        day: birth.day,
        hour: birth.hour,
        minute: birth.minute,
        timeUnknown: birth.timeUnknown,
        at: Date.now()
      });
    }

    function restoreLast() {
      var saved = storage.get(config.storage.savedKey, null);
      if (!saved || typeof saved !== 'object' || !saved.timezone) return;
      var el = function (id) { return document.getElementById(id); };
      el('date').value = pad4(saved.year) + '-' + pad2(saved.month) + '-' + pad2(saved.day);
      if (saved.timeUnknown) {
        el('time-unknown').checked = true;
        el('time-unknown').dispatchEvent(new Event('change'));
      } else {
        el('time').value = pad2(saved.hour) + ':' + pad2(saved.minute);
      }
      city.setPlace({
        label: saved.label,
        name: saved.label,
        latitude: saved.latitude,
        longitude: saved.longitude,
        timezone: saved.timezone
      });
    }

    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function pad4(n) {
      var text = String(n);
      while (text.length < 4) text = '0' + text;
      return text;
    }

    function run() {
      var outcome = root.SMRC.ui.form.read(city.getPlace());
      if (!outcome.ok) {
        var firstField = outcome.errors.date ? 'date'
          : outcome.errors.city ? 'city' : 'time';
        var node = document.getElementById(firstField);
        if (node) node.focus();
        return;
      }

      root.SMRC.ui.form.clearErrors();
      lastName = document.getElementById('name').value.trim();
      results.hidden = true;
      submit.disabled = true;
      submit.textContent = 'Reading\u2026';

      var chart;
      var analysis;
      try {
        chart = root.SMRC.chart.compute(outcome.birth);
        analysis = root.SMRC.reading.analyse(chart);
      } catch (error) {
        submit.disabled = false;
        submit.textContent = 'Reveal my Big Three';
        root.SMRC.ui.form.setError('city',
          'Something went wrong calculating that. Try a nearby city name.');
        return;
      }

      saveLast(outcome.birth);

      /* The reveal is a courtesy, not a gate: the results are already in the
         DOM, so nothing is lost if the animation never runs. */
      root.SMRC.ui.reveal.play(function () {
        root.SMRC.ui.results.render(results, chart, analysis, {
          name: lastName,
          unknownTime: outcome.unknownTime
        });
        results.appendChild(actions());
        submit.disabled = false;
        submit.textContent = 'Reveal my Big Three';
        root.SMRC.ui.reveal.announce(results);
        results.scrollIntoView({ behavior: root.SMRC.ui.reveal.wantsMotion() ? 'smooth' : 'auto', block: 'start' });
      });
    }

    function actions() {
      var h = root.SMRC.ui.results.h;
      return h('div', { class: 'results-actions' }, [
        h('button', {
          type: 'button',
          class: 'btn btn-secondary',
          text: 'Start over',
          onclick: function () {
            document.getElementById('birth-form').reset();
            city.clear();
            root.SMRC.ui.form.clearErrors();
            results.hidden = true;
            document.getElementById('date').focus();
          }
        }),
        h('button', {
          type: 'button',
          class: 'btn btn-secondary',
          text: 'Print or save as PDF',
          onclick: function () { window.print(); }
        }),
        h('a', { class: 'btn btn-secondary', href: '#method', text: 'How this is calculated' })
      ]);
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      run();
    });

    restoreLast();
  });
})(typeof window !== 'undefined' ? window : globalThis);
