/* Form wiring, validation and the city combobox. No astronomy here. */
(function (root) {
  'use strict';

  var config = root.SMRC.config;

  function el(id) {
    return document.getElementById(id);
  }

  /**
   * Ids for one person's block of the form.
   *
   * The compatibility tool needs two birth forms on one page, so every id the
   * widget touches is derived from a prefix. With an empty prefix this is the
   * original single-person form unchanged, which is what the Big Three page and
   * its tests use.
   *
   * @param {string} [prefix]
   * @returns {{city: string, list: string, hint: string, chosen: string,
   *   error: string, date: string, time: string, unknown: string, name: string}}
   */
  function ids(prefix) {
    var p = prefix ? prefix + '-' : '';
    return {
      city: p + 'city',
      list: p + 'city-list',
      hint: p + 'city-hint',
      chosen: p + 'chosen-place',
      error: p + 'city-error',
      date: p + 'date',
      time: p + 'time',
      unknown: p + 'time-unknown',
      name: p + 'name'
    };
  }

  function setError(field, message, prefix) {
    var input = el(field);
    var box = el(field + '-error');
    if (box) {
      box.textContent = message || '';
      box.setAttribute('data-shown', message ? 'true' : 'false');
    }
    if (input) {
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  }

  function clearErrors(prefix) {
    var p = ids(prefix);
    [p.date, p.city, p.time].forEach(function (field) { setError(field, ''); });
  }

  /**
   * The line shown under the city field after a search.
   *
   * A failed search and a search with no matches need different words: one
   * asks the reader to check their connection, the other to respell the name.
   * Conflating them tells someone offline that their city does not exist.
   *
   * @param {{results: object[], failed: boolean, query: string}} answer
   * @param {number} count how many results are on screen
   * @returns {string}
   */
  function searchMessage(answer, count) {
    if (answer.failed) {
      return 'City search is unavailable. Check your connection, or try a '
        + 'different spelling.';
    }
    if (!count) {
      return 'No city matches “' + answer.query + '”. Try a different '
        + 'spelling, or the name in the local language.';
    }
    return count + (count === 1
      ? ' city found. Use the arrow keys and press Enter.'
      : ' cities found. Use the arrow keys and press Enter.');
  }

  /**
   * Read and validate one person's fields.
   *
   * @param {object|null} place the chosen city, or null if none was picked
   * @param {string} [prefix] id prefix for a second person on the same page
   * @returns {{ok: boolean, errors: object, birth: object|null,
   *   unknownTime: boolean, field: string|null}}
   *   birth is a record ready for SMRC.chart.compute, or null if invalid.
   *   field names the first control that needs attention, so a page with two
   *   people can move focus to the right one.
   */
  function read(place, prefix) {
    var errors = {};
    var id = ids(prefix);
    var dateInput = el(id.date);
    var timeInput = el(id.time);
    var cityInput = el(id.city);
    var unknownInput = el(id.unknown);
    var unknown = unknownInput ? unknownInput.checked : false;

    /* Clear first: a field the user has since corrected must not keep the
       invalid state from the previous attempt. */
    clearErrors(prefix);

    var dateValue = dateInput.value;
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
    if (!match) {
      errors.date = 'Enter the date you were born, as YYYY-MM-DD.';
    } else {
      var year = Number(match[1]);
      var month = Number(match[2]);
      var day = Number(match[3]);
      if (year < config.yearRange.min || year > config.yearRange.max) {
        errors.date = 'Enter a year between '
          + config.yearRange.min
          + ' and '
          + config.yearRange.max
          + '.';
      } else if (month < 1 || month > 12 || day < 1 || day > 31) {
        errors.date = 'That date does not exist.';
      } else {
        var probe = new Date(Date.UTC(year, month - 1, day));
        if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
          errors.date = 'That date does not exist.';
        }
      }
    }

    if (!cityInput.value.trim()) {
      errors.city = 'Enter the city you were born in.';
    } else if (!place) {
      errors.city = 'Choose your city from the list, so the coordinates and '
        + 'timezone are right.';
    }

    var hour = 12;
    var minute = 0;
    if (!unknown) {
      var timeValue = timeInput.value;
      if (!/^\d{2}:\d{2}$/.test(timeValue)) {
        errors.time = 'Enter the time you were born, as HH:MM.';
      } else {
        hour = Number(timeValue.slice(0, 2));
        minute = Number(timeValue.slice(3, 5));
        if (hour > 23 || minute > 59) {
          errors.time = 'Time has to be within a single day.';
        }
      }
    }

    var hasErrors = Object.keys(errors).length > 0;
    for (var field in errors) {
      if (Object.prototype.hasOwnProperty.call(errors, field)) {
        setError(id[field], errors[field]);
      }
    }

    if (hasErrors) {
      var first = errors.date ? 'date' : errors.city ? 'city' : 'time';
      return {
        ok: false,
        errors: errors,
        birth: null,
        unknownTime: unknown,
        field: id[first]
      };
    }

    return {
      ok: true,
      errors: errors,
      unknownTime: unknown,
      field: null,
      birth: {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
        hour: hour,
        minute: minute,
        timeUnknown: unknown,
        latitude: place.latitude,
        longitude: place.longitude,
        timezone: place.timezone,
        placeName: place.label
      }
    };
  }

  /* ---------- city combobox ---------- */

  /**
   * Attach the accessible combobox behaviour to a city field.
   *
   * @param {object} [deps] { client } to inject a geocoder in tests, and
   *   { prefix } to bind the second field on a two person page
   * @returns {{getPlace: function, clear: function, focus: function,
   *   setPlace: function}}
   */
  function initCity(deps) {
    var options0 = deps || {};
    var id = ids(options0.prefix);
    var input = el(id.city);
    var list = el(id.list);
    var status = el(id.hint);
    var chosen = el(id.chosen);
    var client = options0.client || root.SMRC.geocode.createClient();
    var place = null;
    var options = [];
    var active = -1;
    var timer = null;
    var lastQuery = '';

    function close() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    }

    function choose(item) {
      place = item;
      input.value = item.label;
      close();
      render();
    }

    function render() {
      chosen.textContent = '';
      if (!place) return;
      var chip = document.createElement('span');
      chip.className = 'chip';
      var text = document.createElement('span');
      text.textContent = place.timezone + ' \u00B7 UTC'
        + root.SMRC.time.formatOffset(root.SMRC.time.offsetMinutesAt(
          place.timezone, Date.now()
        ));
      var clear = document.createElement('button');
      clear.type = 'button';
      clear.setAttribute('aria-label', 'Clear the chosen city');
      clear.textContent = '\u00D7';
      clear.addEventListener('click', function () {
        clearPlace();
        input.focus();
      });
      chip.appendChild(text);
      chip.appendChild(clear);
      chosen.appendChild(chip);
    }

    function clearPlace() {
      place = null;
      input.value = '';
      render();
      setError(id.city, '');
    }

    function open(results, message) {
      options = results;
      list.textContent = '';
      if (!results.length) {
        close();
        return;
      }
      results.forEach(function (item, index) {
        var li = document.createElement('li');
        li.className = 'combo-option';
        li.id = id.list + '-option-' + index;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        var name = document.createElement('span');
        name.textContent = item.label;
        var meta = document.createElement('small');
        meta.textContent = item.timezone.split('/').pop().replace(/_/g, ' ');
        li.appendChild(name);
        li.appendChild(meta);
        li.addEventListener('mousedown', function (event) {
          event.preventDefault();
          choose(item);
        });
        list.appendChild(li);
      });
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      status.textContent = message;
    }

    function highlight(index) {
      var items = list.querySelectorAll('.combo-option');
      if (!items.length) return;
      if (active >= 0 && items[active]) {
        items[active].setAttribute('aria-selected', 'false');
      }
      active = (index + items.length) % items.length;
      items[active].setAttribute('aria-selected', 'true');
      input.setAttribute('aria-activedescendant', items[active].id);
      items[active].scrollIntoView({ block: 'nearest' });
    }

    function lookup() {
      var query = input.value.trim();
      if (query === lastQuery) return;
      lastQuery = query;
      if (query.length < config.geocode.minChars) {
        close();
        status.textContent = 'Type at least ' + config.geocode.minChars
          + ' letters, then pick a city from the list.';
        return;
      }
      status.textContent = 'Searching\u2026';
      client.search(query).then(function (answer) {
        if (input.value.trim() !== query) return;
        if (answer.failed) {
          close();
          status.textContent = searchMessage(answer, 0);
          return;
        }
        open(answer.results, searchMessage(answer, answer.results.length));
        if (!answer.results.length) {
          status.textContent = searchMessage(answer, 0);
        }
      });
    }

    input.addEventListener('input', function () {
      /* Typing invalidates any previously chosen city. */
      if (place && input.value.trim() !== place.label) {
        place = null;
        render();
      }
      setError(id.city, '');
      if (timer) clearTimeout(timer);
      timer = setTimeout(lookup, config.geocode.debounceMs);
    });

    input.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (list.hidden) return;
        event.preventDefault();
        highlight(event.key === 'ArrowDown' ? active + 1 : active - 1);
      } else if (event.key === 'Enter') {
        if (!list.hidden && active >= 0 && options[active]) {
          event.preventDefault();
          choose(options[active]);
        }
      } else if (event.key === 'Escape') {
        if (!list.hidden) {
          event.preventDefault();
          close();
        }
      }
    });

    input.addEventListener('blur', function () {
      window.setTimeout(close, 120);
    });

    return {
      getPlace: function () { return place; },
      clear: clearPlace,
      focus: function () { input.focus(); },
      setPlace: function (item) {
        place = item;
        input.value = item.label;
        render();
      }
    };
  }

  /**
   * Keep the time field and the unknown-time box in step, for one person.
   * @param {string} [prefix] id prefix for the second person on the page
   */
  function initTimeToggle(prefix) {
    var id = ids(prefix);
    var timeInput = el(id.time);
    var unknown = el(id.unknown);
    if (!timeInput || !unknown) return;
    function sync() {
      if (unknown.checked) {
        timeInput.disabled = true;
        timeInput.removeAttribute('aria-invalid');
        setError(id.time, '');
      } else {
        timeInput.disabled = false;
      }
    }
    unknown.addEventListener('change', sync);
    sync();
  }

  root.SMRC = root.SMRC || {};
  root.SMRC.ui = root.SMRC.ui || {};
  root.SMRC.ui.form = {
    read: read,
    setError: setError,
    clearErrors: clearErrors,
    initCity: initCity,
    initTimeToggle: initTimeToggle,
    searchMessage: searchMessage,
    ids: ids,
    el: el
  };
})(typeof window !== 'undefined' ? window : globalThis);
